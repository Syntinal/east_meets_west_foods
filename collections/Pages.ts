import type { CollectionConfig, TextFieldSingleValidation } from "payload";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { slugify } from "@/lib/slugify";
import { NAV_PAGES } from "@/lib/navigation";
import { RichTextBlock, ImageBlock, GalleryBlock, CallToActionBlock, TwoColumnBlock } from "@/blocks";

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
      edit: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        if (!data.slug && data.title) {
          data.slug = slugify(data.title);
        } else if (data.slug) {
          data.slug = slugify(data.slug);
        }
        return data;
      },
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
      blocks: [RichTextBlock, ImageBlock, GalleryBlock, CallToActionBlock, TwoColumnBlock],
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
      ],
    },
  ],
};
