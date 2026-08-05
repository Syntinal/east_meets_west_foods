import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { slugify } from "@/lib/slugify";

export const News: CollectionConfig = {
  slug: "news-posts",
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
    useAsTitle: "title",
    defaultColumns: ["title", "type", "publishedDate", "_status"],
    preview: (doc) => getPreviewURL(`/news/${doc?.slug ?? ""}`),
    livePreview: {
      url: ({ data }) => getPreviewURL(`/news/${data?.slug ?? ""}`),
      openByDefault: true,
    },
    components: {
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
      // Placeholder for real social media publishing (see the `socialMedia`
      // field below). For now this just logs the request server-side so
      // it's visible somewhere other than the admin UI. Guarded on the
      // false->true transition, not just "is it checked", because News has
      // autosave on: without the previousDoc comparison this would log
      // again on every autosave tick while a flagged draft is being edited
      // (see lib/safeRevalidate.ts's comment for the related gotcha about
      // hooks firing more often than a human "save" click). This is also
      // the natural hook point for the real integration later — swap the
      // logger call for enqueuing a SocialMediaPost per platform.
      ({ doc, previousDoc, req }) => {
        const isNowFlagged = Boolean(doc?.socialMedia?.postToSocialMedia);
        const wasFlagged = Boolean(previousDoc?.socialMedia?.postToSocialMedia);
        if (isNowFlagged && !wasFlagged) {
          req.payload.logger.info(
            `[social-media] "${doc.title}" (news-posts/${doc.id}) was marked "Post to Social Media". No integration exists yet — nothing was published.`
          );
        }
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
          "Optional. The homepage banner stops showing itself on this date (e.g. when a sale ends) — no need to come back and uncheck it manually. The site rechecks roughly hourly, so removal isn't second-precise.",
        condition: (_, siblingData) => siblingData.type === "announcement" && siblingData.showAsHomepageBanner,
        date: { pickerAppearance: "dayOnly" },
      },
    },
    // Placeholder for social media publishing — there's no real integration
    // yet (see CLAUDE.md's "Social media" section for the long-term design:
    // a separate SocialMediaPost queue collection, one row per platform per
    // post, created from this flag once that collection exists). Grouping
    // under `socialMedia` now — rather than a bare top-level checkbox — means
    // future sibling fields (per-platform status, a link to the queued
    // posts, etc.) can be added inside this group later without renaming or
    // migrating `postToSocialMedia` itself.
    {
      name: "socialMedia",
      type: "group",
      admin: { position: "sidebar" },
      fields: [
        {
          name: "postToSocialMedia",
          type: "checkbox",
          label: "Post to Social Media",
          defaultValue: false,
          admin: {
            description:
              "Flags this post to go out on social media. Publishing isn't automated yet — checking this doesn't post anywhere yet, see the note below once checked.",
          },
        },
        {
          // `type: "ui"` fields store nothing — this just renders the
          // placeholder notice inline when the checkbox above is on.
          name: "socialMediaNotice",
          type: "ui",
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.postToSocialMedia),
            components: {
              Field: "@/components/admin/SocialMediaPlaceholderNotice#SocialMediaPlaceholderNotice",
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
