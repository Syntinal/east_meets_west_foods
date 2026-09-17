import type { CollectionConfig, TextFieldSingleValidation } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { resolveAutoSlug } from "@/lib/slugify";
import { NAV_PAGES } from "@/lib/navigation";
import { RichTextBlock, ImageBlock, GalleryBlock, CallToActionBlock, TwoColumnBlock, FileBlock, VideoBlock, QuoteBlock, FaqBlock } from "@/blocks";
// Kept out of the shared blocks/index.ts barrel deliberately — a Pages-only
// block, not offered in Home's teaser-card picker. See CardGridBlock.ts's
// own header comment for the full reasoning.
import { CardGridBlock } from "@/blocks/CardGridBlock";

// Slugs that must stay off-limits to admin-created Pages. These aren't
// actually reachable even without this check — every one of them is a
// literal Next.js route folder (app/(frontend)/menu, app/(payload)/admin,
// etc.), and a literal folder always wins over the [slug] catch-all — but
// without the check the owner could publish a page at, say, /menu that
// silently never renders (the real Menu page always wins), with no error
// to explain why. Blocking the slug up front avoids that confusion.
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "next",
  "media",
  ...NAV_PAGES.map((page) => page.href.replace(/^\//, "")).filter(Boolean),
]);

const validateSlug: TextFieldSingleValidation = (value) => {
  if (!value) return true;
  if (RESERVED_SLUGS.has(value.toLowerCase())) {
    return `"${value}" is already used by an existing page on the site — choose a different URL.`;
  }
  return true;
};

// Self-service pages for straightforward informational content (e.g.
// "Catering," "Events," "About Us") — build one by stacking content blocks
// in /admin, no developer needed. Anything requiring custom layout or
// functionality (like the Menu's pricing/filtering) still needs real code;
// this collection is deliberately generic, not a replacement for that.
export const Pages: CollectionConfig = {
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    // Autosave (not just manual "Save Draft") so a brand-new page gets a
    // real DB row — and therefore an auto-generated slug — a couple
    // seconds (Payload's default autosave debounce, versionDefaults.
    // autosaveInterval = 2000ms — the "@default 800" in payload's own
    // Autosave type JSDoc is stale, don't trust it) after the owner types
    // a title. Without this, Live Preview's iframe points at /<slug> for a
    // doc that doesn't exist in Postgres yet and 404s until the first
    // manual save. showSaveDraftButton keeps the existing "Save draft"
    // button (and its tooltip, see ControlTooltips.tsx) visible instead of
    // Payload's default of hiding it once autosave is on.
    //
    // Repeated keystrokes don't bloat version history: Payload debounces
    // client-side and, server-side, updates the same "latest" version row
    // in place as long as it's already an autosave (saveVersion.js /
    // updateLatestVersion.js) — a new row is only created on the first
    // autosave after a real save/publish. versions.maxPerDoc also defaults
    // to 100 with automatic pruning as a backstop, unchanged here.
    drafts: {
      autosave: {
        showSaveDraftButton: true,
      },
    },
  },
  admin: {
    group: "Site Settings",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "showInNav", "_status"],
    description:
      'Add a new page for a straightforward subject (e.g. "Catering," "Events," "About Us"). For anything needing a custom layout or special functionality — like the Menu — that still requires a developer.',
    preview: (doc) => getPreviewURL(`/${doc?.slug ?? ""}`),
    livePreview: {
      url: ({ data }) => getPreviewURL(`/${data?.slug ?? ""}`),
      openByDefault: true,
    },
    components: {
      // Flags abandoned autosave stubs (empty, never-published drafts) so
      // they don't sit invisibly in the list — see
      // components/admin/EmptyDraftsNotice.tsx for why these happen.
      beforeListTable: ["@/components/admin/EmptyDraftsNotice#EmptyDraftsNotice"],
      edit: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    beforeValidate: [
      // Delegates to lib/slugify.ts's resolveAutoSlug, shared with
      // collections/News.ts so the two collections can't drift out of
      // sync — an empty slug is auto-filled from the title, and a
      // non-blank slug still tracks title edits as long as it hasn't been
      // hand-customized (Pages has autosave on too, same as News — see
      // resolveAutoSlug's own comment for why a plain "only fill when
      // blank" check freezes the slug at whatever partial title existed
      // on the first autosave).
      ({ data, originalDoc }) => resolveAutoSlug(data, originalDoc),
    ],
    // Nav placement lives on the doc itself (not a separate global), so any
    // save can change what the site-wide nav looks like — always bust the
    // "layout" cache, not just this page's own path.
    afterChange: [
      ({ doc }) => {
        if (doc?.slug) safeRevalidatePath(`/${doc.slug}`);
        safeRevalidatePath("/", "layout");
      },
    ],
    afterDelete: [
      ({ doc }) => {
        if (doc?.slug) safeRevalidatePath(`/${doc.slug}`);
        safeRevalidatePath("/", "layout");
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "Shown as the page's heading, and — if added to the menu — as the tab label." },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
        description: "Powers the page's URL (eastmeetswestfoods.co/your-slug). Auto-filled from the title if left blank.",
      },
      validate: validateSlug,
    },
    {
      // Lets the owner prep a page as a draft and have it go live on its
      // own at a future date/time, instead of publishing being always-
      // manual — e.g. a seasonal "Holiday Hours" page finished ahead of
      // time. Only takes effect on a *draft* page (see
      // app/(payload)/api/cron/publish-scheduled/route.ts) — setting this
      // on an already-published page does nothing, since there's nothing
      // left to auto-publish.
      name: "publishAt",
      type: "date",
      label: "Auto-publish at",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description: "Optional. If this page is still a draft, it'll be published automatically once this date/time passes — no need to come back and click Publish.",
      },
    },
    {
      type: "group",
      name: "navigation",
      admin: { description: "Controls whether — and where — this page shows up in the site's menu." },
      fields: [
        {
          name: "showInNav",
          type: "checkbox",
          defaultValue: false,
          label: "Show in navigation menu",
        },
        {
          name: "navLabel",
          type: "text",
          label: "Menu label",
          admin: {
            description: "Optional. Defaults to the page title if left blank.",
            condition: (_, siblingData) => Boolean(siblingData?.showInNav),
          },
        },
        {
          name: "navOrder",
          type: "number",
          defaultValue: 100,
          label: "Menu position",
          admin: {
            description:
              'Lower numbers show up earlier in the menu. For reference: Home is 0, Menu is 10, Sauce is 20, Story is 30, News is 40, Testimonials is 50, FAQ is 60, Contact is 70. Defaults to the end.',
            condition: (_, siblingData) => Boolean(siblingData?.showInNav),
          },
        },
      ],
    },
    {
      name: "layout",
      type: "blocks",
      label: "Page content",
      minRows: 1,
      admin: { description: "Build the page by adding content blocks — reorder, remove, or add more any time." },
      blocks: [RichTextBlock, ImageBlock, GalleryBlock, CallToActionBlock, TwoColumnBlock, CardGridBlock, FileBlock, VideoBlock, QuoteBlock, FaqBlock],
    },
    {
      type: "group",
      name: "seo",
      admin: { description: "Search engine + social sharing details for this page." },
      fields: [
        {
          name: "metaDescription",
          type: "textarea",
          admin: { description: "Shown in search results and when the page is shared. Falls back to a generic description if left blank." },
        },
        {
          // Every hardcoded page (Story, Sauce, FAQ, etc.) has a real photo
          // baked into its openGraph.images — see e.g. app/(frontend)/faq/
          // page.tsx. A self-service Page's generateMetadata()
          // (app/(frontend)/[slug]/page.tsx) never set `images` at all, so
          // sharing a new Page's link on Facebook/etc. showed no preview
          // photo. Optional and additive — omitting it keeps today's
          // behavior (no image) exactly as before.
          name: "ogImage",
          type: "upload",
          relationTo: "media",
          label: "Social share image",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "Shown as the preview photo when this page's link is shared on Facebook, etc. Optional." },
        },
      ],
    },
  ],
};
