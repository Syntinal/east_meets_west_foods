import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// Matches the current /menu page structure: 3 "main" cards (photo + description
// + tiered pricing) and 3 "extras" cards (flat pricing, no photo/description).
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  // Plural shows as "Menu" in the /admin sidebar, matching the site's own
  // nav label (lib/navigation.ts) instead of the default "Menu Items".
  labels: {
    singular: "Menu Item",
    plural: "Menu",
  },
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    // /menu is statically cached — bust it the moment an edit is saved,
    // instead of rendering fresh on every visitor request.
    afterChange: [() => revalidatePath("/menu")],
    afterDelete: [() => revalidatePath("/menu")],
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
    defaultColumns: ["title", "group", "order", "_status"],
    // No per-item page exists — preview always shows the whole menu page
    // with this item's draft change applied.
    preview: () => getPreviewURL("/menu"),
    livePreview: {
      // Payload's live-preview merge does a real API round-trip scoped to
      // `initialData.id` on every keystroke (to resolve the `image` relation) —
      // the frontend needs to know which item is actually being edited to seed
      // that correctly. This travels as a cookie (set by /next/preview), not a
      // query string — see getPreviewURL for why.
      url: ({ data }) => getPreviewURL("/menu", data?.id ? String(data.id) : undefined),
      openByDefault: true,
    },
    components: {
      // Replaces the whole List view with a split list+live-preview screen
      // — see components/admin/ListPreviewView.tsx for why (no single doc
      // to attach Payload's own Edit-view preview split to).
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
  defaultSort: "order",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "Name of the dish as it appears on the menu." },
    },
    {
      name: "group",
      type: "select",
      required: true,
      admin: { description: '"Main" gets a photo, description, and tag. "Extras" is just a name and pricing.' },
      options: [
        { label: "Main", value: "main" },
        { label: "Extras", value: "extras" },
      ],
    },
    {
      name: "tag",
      type: "text",
      admin: {
        description: 'e.g. "Northern Chinese", "Best of Both"',
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description: "Short description shown under the dish name on the menu page.",
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Photo shown next to this dish on the menu page.",
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "priceOptions",
      type: "array",
      label: "Prices",
      required: true,
      minRows: 1,
      admin: {
        description: 'One row per size/price (e.g. "Small – $8.99"). At least one is required — click "Add Prices" below to add another.',
      },
      fields: [
        { name: "label", type: "text", required: true, admin: { description: 'e.g. "Small", "Large", "Whole"' } },
        { name: "price", type: "text", required: true, admin: { description: 'e.g. "$8.99"' } },
        { name: "note", type: "text", admin: { description: 'Optional. e.g. "per lb"' } },
      ],
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { description: "Controls the order dishes appear in on the menu page. Lower numbers show first." },
    },
  ],
};
