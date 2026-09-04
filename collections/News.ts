import type { CollectionConfig, Field } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { postToSocialPlatform, type SocialPlatform, type SocialPostResult } from "@/lib/socialPost";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { slugify } from "@/lib/slugify";
import { deriveTitleFromMessage } from "@/lib/newsText";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import {
  buildOverlayVideoUrl,
  type AudioMode,
  type CaptionStyle,
  type CaptionPosition,
  type CaptionFont,
} from "@/lib/cloudinaryVideo";
import { resolveFeaturedImageUrl } from "@/lib/cloudinaryImage";
import { buildClosingCardText } from "@/lib/closingCardText";

// Maps each of the 3 platforms to its own group of fields (see the
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

// Generates one platform's 5 fields (the owner-facing checkbox, the 4
// hidden fields the afterChange hook manages, and its live status notice)
// from a PLATFORM_FIELDS entry — used 3x below instead of hand-duplicating
// the same shape per platform, so Facebook/Instagram/TikTok can't silently
// drift out of sync with each other.
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

// The owner's whole job on this collection is "create a social media post"
// — see the step-by-step wizard below (components/admin/NewsPostWizard.tsx)
// and CLAUDE.md for the full redesign reasoning. WIZARD_STEPS is the single
// source of truth for step numbers/labels, referenced both by the nav
// component (clientProps below) and by every field's own `admin.condition`
// so a field can never end up gated to a step number that doesn't exist.
export const WIZARD_STEPS = [
  "Add a photo or video",
  "Write your post",
  "Choose where to post",
  "Feature on the homepage?",
] as const;

// `admin.condition` is called as (data, siblingData) — siblingData is what
// the rest of this file's existing conditions (e.g. the old
// showAsHomepageBanner/type check this replaced) already read sibling
// top-level fields from, so wizardStep is read the same way here.
function atStep(step: number) {
  return (_data: unknown, siblingData: Record<string, unknown>) =>
    (typeof siblingData?.wizardStep === "number" ? siblingData.wizardStep : 1) === step;
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
    // See collections/Pages.ts for why: autosave gets a new post a real DB
    // row (and auto-generated slug) shortly after the owner starts typing,
    // so Live Preview's /news/<slug> iframe doesn't 404 while the doc only
    // exists as unsaved form state.
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
    defaultColumns: ["title", "publishedDate", "_status"],
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
      ({ data, originalDoc }) => {
        if (!data) return data;
        // Title (the internal page heading) and slug (its URL) are no
        // longer owner-typed — both derive automatically from whatever
        // `message` currently says (see lib/newsText.ts). They freely
        // re-derive on every save right up until this post is actually
        // published for the first time; `titleFinalized` then freezes both
        // permanently, so a real, possibly-already-shared/indexed
        // /news/<slug> URL and page heading never silently change out from
        // under a live post just because the owner tweaked the wording in
        // a later edit. (A naive "only fill when blank" version would
        // freeze the title after the very first autosave on a half-typed
        // message — the same bug this exact freeze-on-publish design
        // avoids; see lib/slugify.ts's own history of this class of bug.)
        // Only once there's actually something written — an autosave can
        // fire the instant "Create new" is clicked, before any typing, and
        // deriving from an empty message would give every fresh/abandoned
        // draft the same title ("Untitled") and the same slug ("untitled"),
        // tripping the slug field's unique constraint the moment a second
        // abandoned draft exists, and breaking the "empty draft, safe to
        // delete" detection in components/admin/ListPreviewView.tsx (which
        // relies on a genuinely untouched draft having no slug at all).
        const message = typeof data.message === "string" ? data.message : "";
        if (!originalDoc?.titleFinalized && message.trim()) {
          data.title = deriveTitleFromMessage(message);
          data.slug = slugify(data.title as string);
        }
        if (data._status === "published") {
          data.titleFinalized = true;
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

        // The Cloudinary overlay video (music + caption baked in, see
        // collections/News.ts's cloudinaryVideo group and
        // lib/cloudinaryVideo.ts) takes priority over the plain Featured
        // Video upload when present — same priority rule
        // components/news/NewsPostView.tsx uses for this post's own page.
        // Built here (not stored) since it's just a transformation URL;
        // computed fresh each time in case the owner changed the caption/
        // music since the last publish.
        const cloudinaryPublicId = doc.cloudinaryVideo?.publicId;
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const overlayVideoUrl =
          cloudinaryPublicId && cloudName
            ? buildOverlayVideoUrl({
                cloudName,
                publicId: cloudinaryPublicId,
                overlayText: doc.cloudinaryVideo?.overlayText,
                additionalTextCards: [doc.cloudinaryVideo?.textCard2, doc.cloudinaryVideo?.textCard3],
                closingCardText: doc.cloudinaryVideo?.addClosingCard ? buildClosingCardText() : null,
                durationSeconds: doc.cloudinaryVideo?.durationSeconds,
                musicPublicId:
                  MUSIC_LIBRARY.find((track) => track.id === doc.cloudinaryVideo?.musicTrackId)?.publicId ?? null,
                audioMode: (doc.cloudinaryVideo?.audioMode as AudioMode) || "replace",
                captionStyle: (doc.cloudinaryVideo?.captionStyle as CaptionStyle) || "white-on-black",
                captionPosition: (doc.cloudinaryVideo?.captionPosition as CaptionPosition) || "bottom",
                captionFont: (doc.cloudinaryVideo?.captionFont as CaptionFont) || "arial",
              })
            : null;

        // The photo caption overlay (see collections/News.ts's photoCaption
        // group and lib/cloudinaryImage.ts) — same priority rule and same
        // "computed fresh, not stored" reasoning as overlayVideoUrl above,
        // just for the photo instead of the video. Applied here so the
        // photo sent to social media always matches what's shown on this
        // post's own page and the News list (see CLAUDE.md for the scope
        // decision — this isn't social-only).
        const resolvedFeaturedImage = resolveFeaturedImageUrl({
          cloudName,
          image: doc.featuredImage,
          captionText: doc.photoCaption?.text,
          captionStyle: doc.photoCaption?.captionStyle,
          captionPosition: doc.photoCaption?.captionPosition,
        });

        const input = {
          // The whole post IS the caption now — see lib/socialPost.ts's
          // buildCaption(), which used to concatenate a separate title +
          // excerpt.
          message: doc.message ?? "",
          link: `${process.env.SITE_URL || ""}/news/${doc.slug ?? ""}`,
          featuredImage: resolvedFeaturedImage ? { url: resolvedFeaturedImage.url } : null,
          // Takes priority over featuredImage in postToSocialPlatform()
          // when both are set — see lib/socialPost.ts.
          featuredVideo: overlayVideoUrl
            ? { url: overlayVideoUrl }
            : doc.featuredVideo && typeof doc.featuredVideo === "object"
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
    // The whole edit screen is a 4-step guided wizard — see
    // components/admin/NewsPostWizard.tsx. `wizardNav` is the Back/Next
    // control strip, rendered once at the top; `wizardStep` is the one
    // piece of shared state every other field's `admin.condition` below
    // reads (via atStep()) to show only the current step's fields. This
    // deliberately reuses Payload's own stock field components (upload
    // pickers, checkboxes, the Video Studio) for each step's actual
    // content instead of reimplementing them inside one giant custom
    // component — only the step sequencing itself is custom.
    {
      name: "wizardNav",
      type: "ui",
      admin: {
        components: {
          Field: {
            path: "@/components/admin/NewsPostWizard#NewsPostWizardNav",
            clientProps: { steps: WIZARD_STEPS },
          },
        },
      },
    },
    { name: "wizardStep", type: "number", defaultValue: 1, admin: { hidden: true } },

    // --- Step 1: add a photo or video ---
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      label: "Add a photo (optional)",
      admin: {
        condition: atStep(1),
        description: "Shown at the top of the post, in the News list, and sent along when posting to social media.",
        // A plain upload field's label renders as normal body text, while
        // its "...or add a video instead" sibling below is a group field
        // (Payload always gives those a bigger <h3>-styled title) — so the
        // two read as mismatched in weight even though they're meant to be
        // an equal either/or choice. See app/(payload)/admin.css for the
        // matching rule.
        className: "news-photo-field",
      },
    },
    // Caption text overlaid directly on the photo itself — the same overlay
    // mechanism/options as the Video Studio's on-screen text below (see
    // lib/cloudinaryImage.ts's buildOverlayImageUrl, which shares its
    // caption-style/position presets and text-encoding fix with
    // lib/cloudinaryVideo.ts's own buildOverlayVideoUrl — one source of
    // truth for how a caption actually renders, image or video), just
    // composited onto this photo instead of a video clip, and via
    // Cloudinary's `fetch` delivery (pulls the photo from wherever
    // collections/Media.ts's own storage already put it, e.g. Vercel Blob)
    // rather than an upload into Cloudinary's own library — this photo is
    // already in Payload's Media collection, no separate upload flow needed
    // the way a raw video clip needs one. Only shown once a photo is
    // actually chosen above. Applied everywhere this photo is used — this
    // post's page, the News list, the homepage News teaser card, and social
    // media — not just the copy sent to social platforms.
    {
      name: "photoCaption",
      type: "group",
      label: "Text on the photo (optional)",
      admin: {
        condition: (_, siblingData) => atStep(1)(_, siblingData) && Boolean(siblingData?.featuredImage),
        description: "Overlays text right on the photo, wherever it's shown — not just on social media.",
      },
      fields: [
        { name: "text", type: "text", label: "Caption text" },
        {
          name: "captionStyle",
          type: "select",
          defaultValue: "white-on-black",
          // Keep in sync with lib/cloudinaryVideo.ts's CAPTION_STYLES.
          options: [
            { label: "White text, black background", value: "white-on-black" },
            { label: "Black text, white background", value: "black-on-white" },
            { label: "White text, red background", value: "white-on-red" },
            { label: "White text, no background", value: "white-no-bg" },
            { label: "Black text, no background", value: "black-no-bg" },
          ],
          admin: { condition: (_, siblingData) => Boolean(siblingData?.text) },
        },
        {
          name: "captionPosition",
          type: "select",
          defaultValue: "bottom",
          // Keep in sync with lib/cloudinaryVideo.ts's CAPTION_POSITIONS.
          options: [
            { label: "Top", value: "top" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "bottom" },
          ],
          admin: { condition: (_, siblingData) => Boolean(siblingData?.text) },
        },
        // "Last confirmed" shadow copies of text/captionStyle/
        // captionPosition above, written only when the owner clicks
        // "Update preview" in PhotoCaptionStudio below — never live off a
        // keystroke or dropdown. Same reasoning and mechanism as
        // cloudinaryVideo's own confirmed* fields: Payload's Live Preview
        // panel is a separate browser context that can't see this
        // component's own local "confirmed yet?" state any other way, so
        // these are the only channel between them (see CLAUDE.md's "Live
        // Preview gap" note — this exists specifically to avoid repeating
        // that bug for photos). confirmedImageId (no equivalent on the
        // video side, which has no separate "which asset" concept — a
        // video's own publicId already stands in for both) guards against
        // a leftover confirmed caption from a since-replaced/removed photo.
        { name: "confirmedImageId", type: "text", admin: { hidden: true } },
        { name: "confirmedText", type: "text", admin: { hidden: true } },
        { name: "confirmedCaptionStyle", type: "text", admin: { hidden: true } },
        { name: "confirmedCaptionPosition", type: "text", admin: { hidden: true } },
        {
          name: "preview",
          type: "ui",
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.text),
            components: { Field: "@/components/admin/PhotoCaptionStudio#PhotoCaptionStudio" },
          },
        },
      ],
    },
    // Turns a raw video clip into a finished promo video with background
    // music and a text caption baked in, via Cloudinary (free tier). See
    // components/admin/CloudinaryVideoStudio.tsx for the wizard step itself
    // and lib/cloudinaryVideo.ts for the transformation-URL logic it shares
    // with this post's page and the social-posting hook above. The 4 real
    // fields here (publicId/overlayText/musicTrackId/audioMode) are
    // `admin.hidden` — the Studio component is their only UI, same idiom
    // as the socialMedia group's hidden status/url/error fields below,
    // just client-written instead of server-written. This is now the only
    // way to add video (see featuredVideo below) — one path, not two.
    {
      name: "cloudinaryVideo",
      type: "group",
      label: "...or add a video instead (optional)",
      admin: {
        condition: atStep(1),
        description:
          "If you add a video, it's used instead of the photo above — everywhere: this post's page, and social media.",
      },
      fields: [
        { name: "publicId", type: "text", admin: { hidden: true } },
        { name: "overlayText", type: "text", admin: { hidden: true } },
        // Up to 2 more cards shown in sequence after overlayText, each
        // getting its own even slice of the clip's timeline — see
        // lib/cloudinaryVideo.ts's buildOverlayVideoUrl. Optional; leaving
        // these blank behaves exactly as before (one caption, full
        // duration).
        { name: "textCard2", type: "text", admin: { hidden: true } },
        { name: "textCard3", type: "text", admin: { hidden: true } },
        // The uploaded clip's own length in seconds, captured from the
        // Cloudinary upload widget's response at upload time (see
        // CloudinaryVideoStudio.tsx) — needed to evenly time-slice more
        // than one text card across the clip. Not owner-facing.
        { name: "durationSeconds", type: "number", admin: { hidden: true } },
        {
          name: "addClosingCard",
          type: "checkbox",
          defaultValue: false,
          admin: { hidden: true },
        },
        {
          name: "musicTrackId",
          type: "select",
          defaultValue: "none",
          options: [
            { label: "No music", value: "none" },
            ...MUSIC_LIBRARY.map((track) => ({ label: track.label, value: track.id })),
          ],
          admin: { hidden: true },
        },
        {
          name: "audioMode",
          type: "select",
          defaultValue: "replace",
          options: [
            { label: "Replace original audio with music", value: "replace" },
            { label: "Mix music under original audio", value: "mix" },
          ],
          admin: { hidden: true },
        },
        {
          name: "captionStyle",
          type: "select",
          defaultValue: "white-on-black",
          // Keep in sync with lib/cloudinaryVideo.ts's CAPTION_STYLES —
          // preset combos, not a raw color picker, so nothing unreadable
          // (e.g. white-on-white) can get picked.
          options: [
            { label: "White text, black background", value: "white-on-black" },
            { label: "Black text, white background", value: "black-on-white" },
            { label: "White text, red background", value: "white-on-red" },
            { label: "White text, no background", value: "white-no-bg" },
            { label: "Black text, no background", value: "black-no-bg" },
          ],
          admin: { hidden: true },
        },
        {
          name: "captionPosition",
          type: "select",
          defaultValue: "bottom",
          // Keep in sync with lib/cloudinaryVideo.ts's CAPTION_POSITIONS.
          options: [
            { label: "Top", value: "top" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "bottom" },
          ],
          admin: { hidden: true },
        },
        {
          name: "captionFont",
          type: "select",
          defaultValue: "arial",
          // Keep in sync with lib/cloudinaryVideo.ts's CAPTION_FONTS.
          options: [
            { label: "Arial (plain)", value: "arial" },
            { label: "Montserrat", value: "montserrat" },
            { label: "Poppins", value: "poppins" },
            { label: "Anton", value: "anton" },
            { label: "Oswald", value: "oswald" },
          ],
          admin: { hidden: true },
        },
        {
          name: "studio",
          type: "ui",
          admin: {
            components: {
              Field: "@/components/admin/CloudinaryVideoStudio#CloudinaryVideoStudio",
            },
          },
        },
        // A second, "confirmed" copy of publicId/overlayText/musicTrackId/
        // audioMode/captionStyle/captionPosition above, written only when
        // the owner clicks "Update preview" in the Studio (see
        // CloudinaryVideoStudio.tsx's updateVideoPreview()) — never live off
        // a keystroke or dropdown change, unlike their real counterparts
        // above. Exists purely so Payload's Live Preview side-by-side panel
        // (components/news/LiveNewsPost.tsx) — a separate browser context
        // from the edit form, which can't see the Studio's own local
        // "confirmed yet?" state any other way — can tell whether the
        // *currently playing* live-preview values match what was last
        // actually confirmed, and if not, keep showing the last confirmed
        // video instead of silently recomputing (and re-requesting from
        // Cloudinary) a brand new one on every edit. Before this existed,
        // Live Preview called the real buildOverlayVideoUrl() live off
        // whatever was currently typed/selected, same problem the Studio's
        // own gated preview was built to avoid, just on a different render
        // path — see CLAUDE.md's "Live Preview gap" note. Plain `text`
        // fields (not `select`, unlike their live counterparts) — never
        // rendered as a dropdown, just storage the Studio and LiveNewsPost
        // both read/write directly.
        { name: "confirmedPublicId", type: "text", admin: { hidden: true } },
        { name: "confirmedOverlayText", type: "text", admin: { hidden: true } },
        { name: "confirmedMusicTrackId", type: "text", admin: { hidden: true } },
        { name: "confirmedAudioMode", type: "text", admin: { hidden: true } },
        { name: "confirmedCaptionStyle", type: "text", admin: { hidden: true } },
        { name: "confirmedCaptionPosition", type: "text", admin: { hidden: true } },
        { name: "confirmedCaptionFont", type: "text", admin: { hidden: true } },
        // "Confirmed" mirrors of textCard2/textCard3/durationSeconds/
        // addClosingCard above — same reasoning and mechanism as the 6
        // confirmed* fields just above (written only on "Update preview",
        // read by both this Studio's own Tier-2 preview and the Live
        // Preview panel via components/news/LiveNewsPost.tsx).
        { name: "confirmedTextCard2", type: "text", admin: { hidden: true } },
        { name: "confirmedTextCard3", type: "text", admin: { hidden: true } },
        { name: "confirmedDurationSeconds", type: "number", admin: { hidden: true } },
        { name: "confirmedAddClosingCard", type: "checkbox", defaultValue: false, admin: { hidden: true } },
      ],
    },
    // No longer offered in the wizard — the Cloudinary Video Studio above
    // is the one video path now (its "no music, no caption" option covers
    // what a plain video upload used to do, with no second, confusingly
    // similar choice). Left in the schema, still `admin.hidden` rather than
    // removed, purely so any already-existing post that used this still
    // renders and posts exactly as it did before (see
    // components/news/NewsPostView.tsx and lib/socialPost.ts, both of
    // which fall back to this only when cloudinaryVideo isn't set).
    {
      name: "featuredVideo",
      type: "upload",
      // media-assets, not media — see collections/MediaAssets.ts for why
      // video lives in a separate collection now.
      relationTo: "media-assets",
      filterOptions: { mimeType: { contains: "video" } },
      admin: { hidden: true },
    },

    // --- Step 2: write your post ---
    {
      name: "message",
      type: "textarea",
      required: true,
      label: "What do you want to say?",
      admin: {
        condition: atStep(2),
        description:
          "This is the whole post — it's what shows on the News page, and it's sent as-is as the caption when you post to Facebook, Instagram, or TikTok below.",
      },
    },

    // --- Step 3: choose where to post ---
    // `platformSocialFields()` generates one platform's 5 fields (the
    // checkbox, 4 hidden hook-managed fields, and its live status notice)
    // from PLATFORM_FIELDS — kept as one shared shape instead of 3 hand-
    // duplicated blocks so the Facebook/Instagram/TikTok sections can't
    // silently drift out of sync with each other.
    {
      name: "socialMedia",
      type: "group",
      admin: { condition: atStep(3) },
      fields: PLATFORM_FIELDS.flatMap((cfg) => platformSocialFields(cfg)),
    },

    // --- Step 4: feature on the homepage? (optional) ---
    {
      name: "showAsHomepageBanner",
      type: "checkbox",
      label: "Feature this as the banner on the homepage",
      defaultValue: false,
      admin: {
        condition: atStep(4),
        description: "Checking this replaces whichever post was featured as the homepage banner before.",
      },
    },
    {
      name: "bannerEndDate",
      type: "date",
      label: "Stop showing the banner on this date (optional)",
      admin: {
        condition: (data, siblingData) => atStep(4)(data, siblingData) && Boolean(siblingData?.showAsHomepageBanner),
        description:
          "The homepage banner stops showing itself on this date (e.g. when a sale ends) — no need to come back and uncheck it manually. The site rechecks roughly once a day, so removal isn't second-precise.",
        date: { pickerAppearance: "dayOnly" },
      },
    },

    // --- Internal bookkeeping — never shown to the owner ---
    {
      name: "title",
      type: "text",
      required: true,
      admin: { hidden: true },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { hidden: true },
    },
    { name: "titleFinalized", type: "checkbox", defaultValue: false, admin: { hidden: true } },
    {
      name: "publishedDate",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      admin: { hidden: true },
    },
  ],
};
