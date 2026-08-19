import type { Block } from "payload";
import { cardGridThumbnail } from "@/lib/blockIcons";

// A generic, self-contained repeating-card grid — the owner types every
// card's content directly here (not wired to Menu Items, Testimonials, or
// any other collection). Deliberately one flexible block instead of
// separate "menu-look" and "testimonial-look" blocks: it visually mimics
// those layouts (reuses the same .menu-grid/.menu-card CSS shell as the
// real /menu page and News list — see app/(frontend)/globals.css) closely
// enough for the owner to build a similar-looking section on any new Page,
// without a full copy of Menu's multi-row pricing or Testimonials' star
// rating/pagination. Scoped to Pages only (not exported from
// blocks/index.ts) — kept out of Home's teaser-card block picker on
// purpose, same reasoning as PageCardBlock/MapCardBlock/CustomCardBlock
// being kept out of this shared barrel in the other direction.
export const CardGridBlock: Block = {
  slug: "cardGrid",
  labels: { singular: "Card Grid", plural: "Card Grid Blocks" },
  admin: { images: { thumbnail: cardGridThumbnail } },
  fields: [
    {
      name: "heading",
      type: "text",
      admin: { description: "Optional heading shown above the cards." },
    },
    {
      name: "cards",
      type: "array",
      minRows: 1,
      admin: { description: "Add, remove, or reorder cards — each is filled in by hand, independent of the Menu or Testimonials." },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "Optional photo shown at the top of the card." },
        },
        {
          name: "title",
          type: "text",
          required: true,
          admin: { description: "Card heading." },
        },
        {
          name: "body",
          type: "textarea",
          admin: { description: "Optional description text." },
        },
        {
          name: "priceLine",
          type: "text",
          label: "Price / tag line",
          admin: {
            description: 'Optional short line shown at the bottom of the card — e.g. "$8.99", "★★★★★", or "Chef\'s Pick".',
          },
        },
      ],
    },
  ],
};
