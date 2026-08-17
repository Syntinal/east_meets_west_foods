import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { postToFacebook } from "@/lib/facebookPost";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { slugify } from "@/lib/slugify";

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
      // Real Facebook publishing, via lib/facebookPost.ts (Upload-Post).
      // Runs inline/awaited — no queue or cron, see lib/facebookPost.ts's
      // header comment for why that's a deliberate choice at this site's
      // volume. A Facebook-side failure is always caught and written to
      // `facebookPostStatus`/`facebookPostError`, never thrown — this must
      // never block or fail the News save itself.
      //
      // Eligibility is gated on durable status, not a previousDoc flip
      // comparison: News has autosave on, so unchecking/rechecking the box
      // while a draft is being fiddled with only ever touches the draft
      // version, not the last *published* value — a flip-based check would
      // miss the owner's natural "uncheck, recheck, publish once" retry.
      // Instead: `posted`/`failed_permanent` are "settled" states that
      // don't retry on routine resaves; a plain `failed` retries
      // automatically next published save (no special action needed); and
      // an explicit uncheck-then-recheck (`justReChecked`) always forces a
      // fresh attempt out of either settled state, resetting the failure
      // counter too.
      //
      // `context.skipFacebookHook` guards against infinite recursion: the
      // write-back below calls payload.update() on this same document,
      // which would otherwise re-trigger this same afterChange hook.
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
      // a real test: the DB had `facebookPostStatus: "posted"` immediately,
      // but the admin screen kept showing "not_posted" until refreshed.
      async ({ doc, previousDoc, req, context }) => {
        if (context?.skipFacebookHook) return;

        const checked = Boolean(doc?.socialMedia?.postToFacebook);
        const wasChecked = Boolean(previousDoc?.socialMedia?.postToFacebook);
        const justReChecked = checked && !wasChecked;
        const status = doc?.socialMedia?.facebookPostStatus;
        const settled = status === "posted" || status === "failed_permanent";

        const eligible = doc?._status === "published" && checked && (!settled || justReChecked);
        if (!eligible) return;

        let relayResult;
        try {
          relayResult = await postToFacebook({
            title: doc.title,
            excerpt: doc.excerpt,
            link: `${process.env.SITE_URL || ""}/news/${doc.slug ?? ""}`,
            featuredImage:
              doc.featuredImage && typeof doc.featuredImage === "object"
                ? { url: doc.featuredImage.url }
                : null,
          });
        } catch (err) {
          relayResult = { success: false, error: err instanceof Error ? err.message : String(err) };
        }

        if (!relayResult.success) {
          req.payload.logger.error(
            `[facebook-post] Failed to post "${doc.title}" (news-posts/${doc.id}): ${relayResult.error}`
          );
        }

        // Upload-Post's own quota snapshot, when the response included one
        // (real success/429 responses do; mock mode and 401s don't) — kept
        // for components/admin/UploadPostUsageNotice.tsx to show "X of Y
        // used this month" without needing a separate usage-check call.
        if (relayResult.usage) {
          await req.payload.updateGlobal({
            slug: "upload-post-usage",
            req,
            overrideAccess: true,
            data: relayResult.usage,
          });
        }

        const failureCount = relayResult.success
          ? 0
          : (doc.socialMedia?.facebookPostFailureCount ?? 0) + 1;
        const nextStatus = relayResult.success
          ? "posted"
          : relayResult.permanent || failureCount >= 3
            ? "failed_permanent"
            : "failed";

        const updatedDoc = await req.payload.update({
          collection: "news-posts",
          id: doc.id,
          req,
          context: { ...context, skipFacebookHook: true },
          draft: false, // top-level option, not part of `data` — see CLAUDE.md's "publishing" gotcha
          data: {
            _status: "published",
            socialMedia: {
              ...doc.socialMedia,
              facebookPostStatus: nextStatus,
              facebookPostUrl: relayResult.success ? relayResult.url : doc.socialMedia?.facebookPostUrl,
              facebookPostError: relayResult.success ? (relayResult.note ?? null) : relayResult.error,
              facebookPostFailureCount: failureCount,
            },
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
    // Real Facebook publishing, via Upload-Post (see lib/facebookPost.ts and
    // the afterChange hook below). Facebook only, deliberately — Facebook's
    // own Page settings can cross-post to the connected Instagram account,
    // so that needs no code here. `facebookPostStatus`/`Url`/`Error`/
    // `FailureCount` are set automatically by the hook, never hand-edited —
    // see the hook's comment for the full eligibility/retry design.
    {
      name: "socialMedia",
      type: "group",
      admin: { position: "sidebar" },
      fields: [
        {
          name: "postToFacebook",
          type: "checkbox",
          label: "Post to Facebook",
          defaultValue: false,
          admin: {
            description:
              "Posts this to the Facebook Page when published. To force a repost of an already-posted item, uncheck this, save, then recheck it and save/publish again.",
          },
        },
        {
          name: "facebookPostStatus",
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
        { name: "facebookPostUrl", type: "text", admin: { readOnly: true, hidden: true } },
        { name: "facebookPostError", type: "text", admin: { readOnly: true, hidden: true } },
        // Counts consecutive non-401 failures so a Facebook-side problem
        // Upload-Post doesn't surface with its own status code (e.g. a
        // revoked Page connection — see the hook's comment) still stops
        // auto-retrying after a few tries, instead of silently burning
        // through the 10/month free quota. Resets to 0 on any success or
        // explicit uncheck/recheck.
        { name: "facebookPostFailureCount", type: "number", defaultValue: 0, admin: { readOnly: true, hidden: true } },
        {
          // `type: "ui"` fields store nothing — this renders the live
          // status (queued/posted/failed) inline when the checkbox above
          // is on, reading the fields above via useFormFields.
          name: "facebookStatusNotice",
          type: "ui",
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.postToFacebook),
            components: {
              Field: "@/components/admin/FacebookPostStatusNotice#FacebookPostStatusNotice",
            },
          },
        },
      ],
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
      admin: { description: "Optional. Image shown at the top of the post and in the News list." },
    },
    {
      name: "body",
      type: "richText",
      required: true,
      admin: { description: "The full content of the post." },
    },
  ],
};
