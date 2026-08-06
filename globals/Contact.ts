import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The Contact page, previously hand-coded HTML — now editable. The Google
// Maps embed/overlay link and the JSON-LD `hasMap` URL in
// app/(frontend)/contact/page.tsx stay hardcoded on purpose — both are
// derived from the address in a way that's fragile to regenerate from free
// text, and the business physically relocating is rare enough to accept as
// a documented limit (see the `address` field description below) rather
// than build address→geocoding.
export const Contact: GlobalConfig = {
  slug: "contact",
  label: "Contact",
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
    preview: () => getPreviewURL("/contact"),
    livePreview: {
      url: () => getPreviewURL("/contact"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/contact")],
  },
  fields: [
    { name: "heading", type: "text", admin: { description: "The page heading." } },
    { name: "subtitle", type: "text", admin: { description: "Short line under the business name." } },
    {
      name: "address",
      type: "textarea",
      admin: {
        description:
          "Shown on the page. Editing this fixes typos/display text only — the map embed and search-engine location data are separate and won't follow an address change automatically. If the business ever actually relocates, a developer needs to update those too.",
      },
    },
    {
      name: "phone",
      type: "text",
      admin: {
        description: 'e.g. "(208) 627-6283" — also used to build the click-to-call link (assumes a 10-digit US number).',
      },
    },
    { name: "blurb", type: "textarea", admin: { description: "Short line about the location, shown under the phone number." } },
  ],
};
