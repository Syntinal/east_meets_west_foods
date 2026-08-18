import type { Block } from "payload";

export const TwoColumnBlock: Block = {
  slug: "twoColumn",
  // "Block.admin" doesn't support a `description` (caught by next build's
  // type check, not next dev) — the block's `labels.singular` is what
  // shows in the admin's "add block" picker instead.
  labels: { singular: "Two Column (side-by-side photo + text)", plural: "Two Column Blocks" },
  fields: [
    {
      type: "group",
      name: "left",
      label: "Left column",
      fields: [
        { name: "image", type: "upload", relationTo: "media", filterOptions: { mimeType: { contains: "image" } } },
        { name: "content", type: "richText" },
      ],
    },
    {
      type: "group",
      name: "right",
      label: "Right column",
      fields: [
        { name: "image", type: "upload", relationTo: "media", filterOptions: { mimeType: { contains: "image" } } },
        { name: "content", type: "richText" },
      ],
    },
  ],
};
