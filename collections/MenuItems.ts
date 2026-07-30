import type { CollectionConfig } from "payload";

// Matches the current /menu page structure: 3 "main" cards (photo + description
// + tiered pricing) and 3 "extras" cards (flat pricing, no photo/description).
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "group", "order"],
  },
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "tag", type: "text", admin: { description: 'e.g. "Northern Chinese", "Best of Both"' } },
    {
      name: "group",
      type: "select",
      required: true,
      options: [
        { label: "Main", value: "main" },
        { label: "Extras", value: "extras" },
      ],
    },
    { name: "description", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "priceOptions",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "price", type: "text", required: true },
        { name: "note", type: "text" },
      ],
    },
    { name: "order", type: "number", defaultValue: 0 },
  ],
};
