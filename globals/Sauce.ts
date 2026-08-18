import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The Sauce page, previously hand-coded HTML — now editable, same
// singleton-Global + drafts + Live Preview shape as globals/Home.ts (see
// that file's header comment for why a Global fits a fixed one-off page
// better than an autosave-drafts Collection). The page's <title>/meta/OG/
// Twitter tags and shared restaurantSchema JSON-LD stay hardcoded in
// app/(frontend)/sauce/page.tsx exactly as before — only the visible body
// copy and photo below become admin-editable.
export const Sauce: GlobalConfig = {
  slug: "sauce",
  // Shows as "The Sauce" in the /admin sidebar, matching the site's own
  // nav label (lib/navigation.ts) rather than the bare slug.
  label: "The Sauce",
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
    preview: () => getPreviewURL("/sauce"),
    livePreview: {
      url: () => getPreviewURL("/sauce"),
      openByDefault: true,
    },
    components: {
      // Globals shape this differently from Collections — `elements`, not
      // `edit` (see globals/Home.ts for the fuller explanation).
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/sauce")],
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
          admin: { description: "Photo shown next to the sauce copy." },
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
          admin: { description: "The main copy about the sauce." },
        },
      ],
    },
    {
      type: "group",
      name: "pullQuote",
      fields: [
        { name: "quote", type: "text" },
        { name: "citation", type: "text", admin: { description: 'e.g. "— Roger, Owner"' } },
      ],
    },
  ],
};
