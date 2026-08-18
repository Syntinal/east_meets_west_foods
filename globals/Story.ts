import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The Our Story page, previously hand-coded HTML — now editable. Same
// shape as globals/Sauce.ts / globals/Home.ts; see Home's header comment
// for the full reasoning. <title>/meta/OG/Twitter/JSON-LD stay hardcoded
// in app/(frontend)/story/page.tsx — only body copy + photo are editable.
export const Story: GlobalConfig = {
  slug: "story",
  label: "Our Story",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    preview: () => getPreviewURL("/story"),
    livePreview: {
      url: () => getPreviewURL("/story"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/story")],
  },
  fields: [
    {
      type: "group",
      name: "hero",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "Photo shown next to the story copy." },
        },
      ],
    },
    {
      type: "group",
      name: "content",
      fields: [
        { name: "heading", type: "text", admin: { description: "The big headline at the top of the page." } },
        {
          name: "body",
          type: "richText",
          admin: { description: "The main story copy." },
        },
      ],
    },
    {
      type: "group",
      name: "pullQuote",
      fields: [
        { name: "quote", type: "text" },
        { name: "citation", type: "text", admin: { description: 'e.g. "— Richard, Chef"' } },
      ],
    },
  ],
};
