import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";
import { PageCardBlock } from "@/blocks/PageCardBlock";
import { MapCardBlock } from "@/blocks/MapCardBlock";
import { CustomCardBlock } from "@/blocks/CustomCardBlock";

// The homepage is a singleton, so it's a Global (like Navigation) rather than
// a Collection — but unlike Navigation, this one uses drafts + Live Preview,
// the same as MenuItems/News/Testimonials. It's a singleton, no per-item id
// to key a live-preview merge off of, so `initialData` can just be the whole
// fetched doc (closer to News' single-doc pattern than Menu Items').
//
// Every piece of visible on-page text is exposed here, including labels
// previously treated as "permanent structural" and left hardcoded (the
// "Our Mission" eyebrow, teaser card CTA strings, etc.) — the owner asked
// for every aspect of the site to be editable, not just content with an
// obvious realistic reason to change. The teaser card *headings*
// (Menu/The Sauce/Our Story/News) are the one exception that's still not a
// field here: those are sourced from the Navigation global's per-page
// label fields instead (see lib/navigation.ts's resolveNavLabel and
// app/(frontend)/page.tsx), so editing a nav label updates both places at
// once rather than needing the same word typed in two different globals.
//
// `teaserCards` is a Blocks field (not a fixed group per card) so the owner
// can add, remove, and reorder cards freely — same pattern as the Pages
// collection's `layout` field (collections/Pages.ts → blocks/*.ts →
// components/pages/BlockRenderer.tsx). The 3 block types
// (blocks/{PageCard,MapCard,CustomCard}Block.ts) are homepage-specific —
// deliberately not added to the shared blocks/index.ts barrel Pages uses,
// since e.g. a "pageCard" tied to one of this site's own fixed pages
// wouldn't make sense as a general-purpose Page block.
export const Home: GlobalConfig = {
  slug: "home",
  // Shows as "Home Page" in the /admin sidebar (default would just be
  // "Home," easy to misread as a link back to the live site rather than
  // the edit screen for it). Doesn't touch the public nav — that's the
  // separate NAV_PAGES list in lib/navigation.ts, still just "Home" there.
  label: "Home Page",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    // `validate: true` makes Save Draft run the same field validation as
    // Publish (maxLength, required, etc.) — without it, Payload skips most
    // validation on draft saves by design, so a pasted paragraph well over
    // a card body's maxLength would save silently as a draft and only get
    // caught at Publish time. Safe to turn on here specifically because
    // Home has no autosave (see below) — every draft save is a deliberate
    // "Save Draft" click, not an in-progress autosave tick, so there's no
    // risk of blocking mid-typing the way it would on an autosave-enabled
    // entity (News, Pages — deliberately left alone, see their own
    // versions.drafts config).
    drafts: {
      validate: true,
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
    preview: () => getPreviewURL("/"),
    livePreview: {
      url: () => getPreviewURL("/"),
      openByDefault: true,
    },
    components: {
      // Globals shape this differently from Collections — `elements`, not
      // `edit` (confirmed via payload/dist/globals/config/types.d.ts).
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/")],
  },
  fields: [
    {
      type: "group",
      name: "header",
      fields: [
        {
          name: "logoImage",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "Transparent PNG recommended. Appears next to the site name in the header." },
        },
        {
          name: "tagline",
          type: "text",
          defaultValue: "Ponderay, Idaho · Made fresh daily",
          admin: { description: "Small line under the logo in the site header." },
        },
      ],
    },
    {
      type: "group",
      name: "hero",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: {
            description:
              "Landscape orientation, at least 1600×900px recommended — this is the large banner photo at the top of the page.",
          },
        },
      ],
    },
    {
      type: "group",
      name: "announcementBanner",
      admin: {
        description:
          "Only shown when there's an active homepage announcement (see News). Labels the banner itself.",
      },
      fields: [
        { name: "badgeLabel", type: "text", defaultValue: "Announcement" },
        { name: "linkText", type: "text", defaultValue: "Read more →" },
      ],
    },
    {
      type: "group",
      name: "mission",
      fields: [
        {
          name: "eyebrow",
          type: "text",
          defaultValue: "Our Mission",
          admin: { description: "Small label above the main heading." },
        },
        {
          name: "heading",
          type: "text",
          defaultValue: "East Meets West Dumplings Bar",
          admin: { description: "The large heading near the top of the homepage." },
        },
        {
          name: "statement",
          type: "textarea",
          admin: { description: "The main mission/tagline paragraph shown near the top of the homepage." },
        },
        {
          name: "location",
          type: "text",
          admin: { description: "The short location/description line under the mission statement." },
        },
      ],
    },
    {
      type: "blocks",
      name: "teaserCards",
      admin: {
        description:
          "The row of preview cards on the homepage. Add, remove, or reorder as many as you like. " +
          '"Page Card" links to one of this site\'s own pages (its heading matches that page\'s nav label — edit ' +
          'that on the Navigation page instead). "Map Card" is the Visit/Contact card with the embedded map. ' +
          '"Custom Card" can link anywhere — another page you\'ve created, a phone number, or any URL.',
      },
      blocks: [PageCardBlock, MapCardBlock, CustomCardBlock],
    },
    {
      type: "group",
      name: "gallery",
      fields: [
        { name: "eyebrow", type: "text", defaultValue: "Gallery" },
        { name: "heading", type: "text", defaultValue: "A Closer Look" },
        {
          name: "photos",
          type: "array",
          admin: { description: "Add, remove, or reorder photos for the Gallery section on the homepage." },
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              required: true,
              filterOptions: { mimeType: { contains: "image" } },
              admin: { description: "Any orientation. Shown in a grid visitors can click to enlarge." },
            },
            {
              name: "caption",
              type: "text",
              admin: {
                description: "Optional — used as this photo's accessibility description, not shown visibly on the page.",
              },
            },
          ],
        },
      ],
    },
    {
      type: "group",
      name: "testimonialsSection",
      admin: {
        description: 'Headings above the homepage Testimonials carousel. Only shown when there are testimonials to display.',
      },
      fields: [
        { name: "eyebrow", type: "text", defaultValue: "What People Are Saying" },
        { name: "heading", type: "text", defaultValue: "Testimonials" },
      ],
    },
    {
      type: "group",
      name: "seo",
      admin: { description: "SEO-focused copy near the bottom of the homepage — useful for tuning local search terms." },
      fields: [
        { name: "eyebrow", type: "text" },
        { name: "heading", type: "text" },
        {
          name: "body",
          type: "richText",
          admin: { description: "Supports links, e.g. to /menu or /contact — kept as rich text so those stay editable." },
        },
      ],
    },
  ],
};
