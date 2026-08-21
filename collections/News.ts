import type { CollectionConfig, Field } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { postToSocialPlatform, type SocialPlatform, type SocialPostResult } from "@/lib/socialPost";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { slugify } from "@/lib/slugify";

// Maps each of the 3 platforms to its own group of sidebar fields (see the
// `socialMedia` group below) — one config object driving both the
// `afterChange` hook and the field definitions, so adding a 4th platform
// later means extending this array plus adding one more field block, not
// touching the hook's control flow.
type PlatformFieldConfig = {
  platform: SocialPlatform;
  checkboxField: string;
  statusField: string;
  urlField: string;
  errorField: string;
  failureCountField: string;
};

const PLATFORM_FIELDS: PlatformFieldConfig[] = [
  {
    platform: "facebook",
    checkboxField: "postToFacebook",
    statusField: "facebookPostStatus",
    urlField: "facebookPostUrl",
    errorField: "facebookPostError",
    failureCountField: "facebookPostFailureCount",
  },
  {
    platform: "instagram",
    checkboxField: "postToInstagram",
    statusField: "instagramPostStatus",
    urlField: "instagramPostUrl",
    errorField: "instagramPostError",
    failureCountField: "instagramPostFailureCount",
  },
  {
    platform: "tiktok",
    checkboxField: "postToTikTok",
    statusField: "tikTokPostStatus",
    urlField: "tikTokPostUrl",
    errorField: "tikTokPostError",
    failureCountField: "tikTokPostFailureCount",
  },
];

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Generates one platform's 5 sidebar fields (the owner-facing checkbox,
// the 4 hidden fields the afterChange hook manages, and its live status
// notice) from a PLATFORM_FIELDS entry — used 3x below instead of hand-
// duplicating the same shape per platform, so Facebook/Instagram/TikTok
// can't silently drift out of sync with each other.
function platformSocialFields(cfg: PlatformFieldConfig): Field[] {
  const label = PLATFORM_LABEL[cfg.platform];
  return [
    {
      name: cfg.checkboxField,
      type: "checkbox",
      label: `Post to ${label}`,
      defaultValue: false,
      admin: {
        description: `Posts this to ${label} when published. To force a repost of an already-posted item, uncheck this, save, then recheck it and save/publish again.`,
      },
    },
    {
      name: cfg.statusField,
      type: "select",
      defaultValue: "not_posted",
      options: [
        { label: "Not posted", value: "not_posted" },
        { label: "Posted", value: "posted" },
        { label: "Failed (will retry)", value: "failed" },
        { label: "Failed (needs attention)", value: "failed_permanent" },
      ],
      admin: { readOnly: true, hidden: true },
    },
    { name: cfg.urlField, type: "text", admin: { readOnly: true, hidden: true } },
    { name: cfg.errorField, type: "text", admin: { readOnly: true, hidden: true } },
    // Counts consecutive non-permanent failures so a platform-side
    // problem Post for Me doesn't surface with a clearly-permanent error
    // (e.g. a revoked account connection inside Post for Me — see the
    // hook's comment) still stops auto-retrying after a few tries.
    // Resets to 0 on any success or explicit uncheck/recheck.
    { name: cfg.failureCountField, type: "number", defaultValue: 0, admin: { readOnly: true, hidden: true } },
    {
      // `type: "ui"` fields store nothing — this renders the live status
      // (queued/posted/failed) inline when the checkbox above is on,
      // reading the fields above via useFormFields. `clientProps` (rather
      // than 3 separate wrapper components) tells the shared component
      // which platform's fields to read — see
      // components/admin/SocialPostStatusNotice.tsx.
      name: `${cfg.checkboxField}StatusNotice`,
      type: "ui",
      admin: {
        condition: (_, siblingData) => Boolean(siblingData?.[cfg.checkboxField]),
        components: {
          Field: {
            path: "@/components/admin/SocialPostStatusNotice#SocialPostStatusNotice",
            clientProps: { platform: cfg.platform },
          },
        },
      },
    },
  ];
}

export const News: CollectionConfig = {
  slug: "news-posts",
  // Plural shows as "News" in the /admin sidebar, matching the site's own
  // nav label (lib/navigation.ts) instead of the default "News Posts".
  labels: {
    singular: "News Post",
    plural: "News",
  },
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    // See collections/Pages.ts for why: autosave gets a new post/announcement
    // a real DB row (and auto-generated slug) shortly after a title is
    // typed, so Live Preview's /news/<slug> iframe doesn't 404 while the
    // doc only exists as unsaved form state.
    drafts: {
      autosave: {
        showSaveDraftButton: true,
      },
    },
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    useAsTitle: "title",
    defaultColumns: ["title", "type", "publishedDate", "_status"],
    preview: (doc) => getPreviewURL(`/news/${doc?.slug ?? ""}`),
    livePreview: {
      url: ({ data }) => getPreviewURL(`/news/${data?.slug ?? ""}`),
      openByDefault: true,
    },
    components: {
      // Replaces the whole List view with a split list+live-preview screen
      // — see components/admin/ListPreviewView.tsx for why (each post has
      // its own page, but there's no overview preview before opening one).
      views: {
        list: {
          Component: "@/components/admin/ListPreviewView#ListPreviewView",
        },
      },
      edit: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc }) => {
        safeRevalidatePath("/news");
        if (doc?.slug) safeRevalidatePath(`/news/${doc.slug}`);
        safeRevalidatePath("/");
      },
      // Real social publishing (Facebook, Instagram, TikTok), via
      // lib/socialPost.ts (Post for Me). Runs inline/awaited — no queue or
      // cron, see lib/socialPost.ts's header comment for why that's a
      // deliberate choice at this site's volume (and how it copes with
      // Post for Me's own create call being asynchronous under the hood).
      // A platform-side failure is always caught and written to that
      // platform's own status/error fields, never thrown — this must
      // never block or fail the News save itself.
      //
      // Each of the 3 platforms (PLATFORM_FIELDS above) is independently
      // eligible/gated/retried — checking "Post to Instagram" doesn't
      // touch Facebook's or TikTok's status, and one platform failing
      // doesn't block the others from posting. Eligibility itself is
      // gated on durable status, not a previousDoc flip comparison: News
      // has autosave on, so unchecking/rechecking a box while a draft is
      // being fiddled with only ever touches the draft version, not the
      // last *published* value — a flip-based check would miss the
      // owner's natural "uncheck, recheck, publish once" retry. Instead:
      // `posted`/`failed_permanent` are "settled" states that don't retry
      // on routine resaves; a plain `failed` retries automatically next
      // published save (no special action needed); and an explicit
      // uncheck-then-recheck (`justReChecked`) always forces a fresh
      // attempt out of either settled state, resetting that platform's
      // failure counter too.
      //
      // Eligible platforms are posted to concurrently (Promise.all), not
      // sequentially — each call can take up to ~9s (Post for Me's create
      // call plus its bounded result poll, see lib/socialPost.ts), and
      // running 3 of those in series would risk Vercel's maxDuration.
      //
      // `context.skipSocialPostHook` guards against infinite recursion:
      // the write-back below calls payload.update() on this same
      // document, which would otherwise re-trigger this same afterChange
      // hook.
      //
      // Returns the freshly-updated doc at the end (rather than nothing) —
      // Payload's afterChange chain does `result = (await hook(...)) ||
      // result` (see node_modules/payload/dist/collections/operations/
      // utilities/update.js), so whatever a hook returns becomes the doc
      // used for every hook after it AND the final API response the admin
      // UI renders from. Without this, the nested payload.update() below
      // still persists correctly, but the Publish button's own response —
      // and therefore the on-screen status notice — kept showing the
      // pre-write-back state until the document was reloaded. Confirmed via
      // a real test: the DB had the new status immediately, but the admin
      // screen kept showing the old one until refreshed.
      async ({ doc, previousDoc, req, context }) => {
        if (context?.skipSocialPostHook) return;

        const socialMedia = doc?.socialMedia ?? {};
        const previousSocialMedia = previousDoc?.socialMedia ?? {};

        const eligiblePlatforms = PLATFORM_FIELDS.map((cfg) => {
          const checked = Boolean(socialMedia[cfg.checkboxField]);
          const wasChecked = Boolean(previousSocialMedia[cfg.checkboxField]);
          const justReChecked = checked && !wasChecked;
          const status = socialMedia[cfg.statusField];
          const settled = status === "posted" || status === "failed_permanent";
          const eligible = doc?._status === "published" && checked && (!settled || justReChecked);
          return { cfg, justReChecked, eligible };
        }).filter((p) => p.eligible);
        if (eligiblePlatforms.length === 0) return;

        const input = {
          title: doc.title,
          excerpt: doc.excerpt,
          link: `${process.env.SITE_URL || ""}/news/${doc.slug ?? ""}`,
          featuredImage:
            doc.featuredImage && typeof doc.featuredImage === "object"
              ? { url: doc.featuredImage.url }
              : null,
          // Takes priority over featuredImage in postToSocialPlatform()
          // when both are set — see lib/socialPost.ts.
          featuredVideo:
            doc.featuredVideo && typeof doc.featuredVideo === "object"
              ? { url: doc.featuredVideo.url }
              : null,
        };

        const attempts = await Promise.all(
          eligiblePlatforms.map(async ({ cfg, justReChecked }) => {
            let result: SocialPostResult;
            try {
              result = await postToSocialPlatform(cfg.platform, input);
            } catch (err) {
              result = { success: false, error: err instanceof Error ? err.message : String(err) };
            }
            if (!result.success) {
              req.payload.logger.error(
                `[social-post] Failed to post "${doc.title}" to ${cfg.platform} (news-posts/${doc.id}): ${result.error}`
              );
            }
            return { cfg, justReChecked, result };
          })
        );

        // Post for Me's own polling (lib/socialPost.ts) can take several
        // seconds, up from the near-instant Buffer/Upload-Post calls this
        // hook was originally written around — long enough that the owner
        // can realistically resave this doc (e.g. uncheck a platform's
        // box) while the calls above are still awaiting. Re-reading the
        // doc here, right before writing, instead of reusing the `doc`
        // object captured when this hook started, means that edit doesn't
        // get silently clobbered by this write-back reasserting stale
        // `socialMedia` data. `overrideAccess: true` matches every other
        // Local API read in this codebase (see CLAUDE.md's Local-API-
        // access gotcha) — this hook already runs with full server trust.
        const currentDoc = await req.payload.findByID({
          collection: "news-posts",
          id: doc.id,
          req,
          overrideAccess: true,
          depth: 0,
        });

        // Cast to a plain string-indexed record — PLATFORM_FIELDS' field
        // names are only known as `string` at the type level (they'd need
        // to be a literal union for Payload's generated `socialMedia`
        // type to accept dynamic keys directly), so this is the same kind
        // of escape hatch `nextSocialMedia` below already needed.
        const priorSocialMedia = (currentDoc.socialMedia ?? {}) as Record<string, unknown>;
        const nextSocialMedia: Record<string, unknown> = { ...priorSocialMedia };
        for (const { cfg, justReChecked, result } of attempts) {
          // An explicit uncheck-then-recheck always starts a fresh count,
          // even if this particular attempt fails again — otherwise a
          // recheck that fails would keep climbing the old (pre-recheck)
          // count instead of restarting it, contradicting the "resetting
          // the failure counter too" behavior this hook is documented to
          // have. (Caught by this session's own verification pass —
          // see CLAUDE.md.)
          const priorFailureCount = justReChecked ? 0 : ((priorSocialMedia[cfg.failureCountField] as number) ?? 0);
          const failureCount = result.success ? 0 : priorFailureCount + 1;
          nextSocialMedia[cfg.statusField] = result.success
            ? "posted"
            : result.permanent || failureCount >= 3
              ? "failed_permanent"
              : "failed";
          // `result.url` is only set on a *confirmed* success — Post for
          // Me's own posted-pending-confirmation case (see
          // lib/socialPost.ts) is `success: true` with no `url`, so
          // falling straight back to `undefined` here would blank out a
          // real URL from an earlier confirmed post. Keep whatever was
          // already on file unless we actually have a fresher one.
          nextSocialMedia[cfg.urlField] = result.success
            ? (result.url ?? priorSocialMedia[cfg.urlField])
            : priorSocialMedia[cfg.urlField];
          nextSocialMedia[cfg.errorField] = result.success ? (result.note ?? null) : result.error;
          nextSocialMedia[cfg.failureCountField] = failureCount;
        }

        const updatedDoc = await req.payload.update({
          collection: "news-posts",
          id: doc.id,
          req,
          context: { ...context, skipSocialPostHook: true },
          draft: false, // top-level option, not part of `data` — see CLAUDE.md's "publishing" gotcha
          data: {
            _status: "published",
            socialMedia: nextSocialMedia,
          },
        });

        return updatedDoc;
      },
    ],
    afterDelete: [
      ({ doc }) => {
        safeRevalidatePath("/news");
        if (doc?.slug) safeRevalidatePath(`/news/${doc.slug}`);
        safeRevalidatePath("/");
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "The headline shown on the News page and at the top of the post." },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
        description: "Powers the post's URL (/news/your-slug). Auto-filled from the title if left blank.",
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "post",
      admin: {
        position: "sidebar",
        description: '"Post" is a regular news article. "Announcement" is a short notice that can optionally show as a banner on the homepage.',
      },
      options: [
        { label: "Post", value: "post" },
        { label: "Announcement", value: "announcement" },
      ],
    },
    {
      name: "showAsHomepageBanner",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Feature this as the banner on the homepage. Checking it here replaces whichever announcement was featured before.",
        condition: (_, siblingData) => siblingData.type === "announcement",
      },
    },
    {
      name: "bannerEndDate",
      type: "date",
      admin: {
        position: "sidebar",
        description:
          "Optional. The homepage banner stops showing itself on this date (e.g. when a sale ends) — no need to come back and uncheck it manually. The site rechecks roughly once a day, so removal isn't second-precise.",
        condition: (_, siblingData) => siblingData.type === "announcement" && siblingData.showAsHomepageBanner,
        date: { pickerAppearance: "dayOnly" },
      },
    },
    // Real social publishing (Facebook, Instagram, TikTok), via Post for
    // Me (see lib/socialPost.ts and the afterChange hook above). Started
    // Facebook-only (Facebook's own Page settings can cross-post to a
    // linked Instagram account on their own — that's still true, but the
    // owner asked for real Instagram/TikTok posting through Post for Me
    // too, not just Facebook's own auto-crosspost) and expanded once all
    // 3 accounts were confirmed connectable. Each platform's status/url/
    // error/failureCount fields are set automatically by the hook, never
    // hand-edited — see the hook's comment for the full eligibility/retry
    // design, and PLATFORM_FIELDS above for the config driving both this
    // block and the hook.
    //
    // `platformSocialFields()` generates one platform's 5 fields (the
    // checkbox, 4 hidden hook-managed fields, and its live status notice)
    // from PLATFORM_FIELDS — kept as one shared shape instead of 3 hand-
    // duplicated blocks so the Facebook/Instagram/TikTok sections can't
    // silently drift out of sync with each other.
    {
      name: "socialMedia",
      type: "group",
      admin: { position: "sidebar" },
      fields: PLATFORM_FIELDS.flatMap((cfg) => platformSocialFields(cfg)),
    },
    {
      name: "publishedDate",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        description: "The date shown on the post. Defaults to today.",
      },
    },
    { name: "excerpt", type: "textarea", admin: { description: "Short summary shown on the News list and used as the page description for search engines." } },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      admin: { description: "Optional. Image shown at the top of the post and in the News list." },
    },
    {
      name: "featuredVideo",
      type: "upload",
      // media-assets, not media — see collections/MediaAssets.ts for why
      // video lives in a separate collection now.
      relationTo: "media-assets",
      filterOptions: { mimeType: { contains: "video" } },
      admin: {
        description:
          "Optional. Video shown at the top of the post instead of the featured image, and sent to whichever " +
          "of Facebook/Instagram/TikTok are checked below instead of the featured image when posting (if both " +
          "are set, the video takes priority in both places). The News list still uses the featured image, " +
          "not this, for its thumbnail.",
      },
    },
    {
      name: "body",
      type: "richText",
      required: true,
      admin: { description: "The full content of the post." },
    },
  ],
};
