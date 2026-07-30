import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// Matches the current /menu page structure: 3 "main" cards (photo + description
// + tiered pricing) and 3 "extras" cards (flat pricing, no photo/description).
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
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
    useAsTitle: "title",
    defaultColumns: ["title", "group", "order", "_status"],
    // No per-item page exists — preview always shows the whole menu page
    // with this item's draft change applied.
    preview: () => getPreviewURL("/menu"),
  },
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", required: true },
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
      admin: { condition: (_, siblingData) => siblingData.group === "main" },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: { condition: (_, siblingData) => siblingData.group === "main" },
    },
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
