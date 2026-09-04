import type { Block } from "payload";
import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
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
//
// A real menu-style multi-row "Prices" array + a Photo Card/Price List
// style toggle were built and verified here (matching /menu's own
// .price-list and .extras-card exactly), then deliberately reverted —
// not a mistake, a considered call after building it: it only pays off if
// a future page actually wants real menu-style pricing, which isn't a
// known need yet, and the owner was right to question adding that much
// structure to a "generic" block on spec. The single free-text "Price /
// tag line" field below covers the same visual ground (a red bold line at
// the bottom of the card) for the cases that actually come up — a price,
// a star rating, a "Chef's Pick" tag. Revisit if a real page ever needs
// actual multi-row pricing; see git history for the full built-and-tested
// version if so.
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
          name: "title",
          type: "text",
          required: true,
          admin: { description: "Card heading." },
        },
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "Optional photo shown at the top of the card." },
        },
        {
          // Was a plain textarea — owner asked whether card body could be
          // rich text, then asked to add bulleted and numbered lists on
          // top of that. Still a deliberately small toolbar (bold, italic,
          // links, the two list types — no headings/blockquote) rather
          // than the site's default full lexicalEditor() (set once,
          // globally, in payload.config.ts): this is a short description
          // on a compact card, repeated in a list of cards, not a page's
          // main body copy — a heading here would blow out the card's
          // fixed layout (.menu-card-body, reused from the real /menu
          // grid). InlineToolbarFeature (appears on text selection)
          // instead of FixedToolbarFeature, since a permanently-visible
          // toolbar on every single card in the array would be a lot of
          // visual weight for a field this small. Adding list support here
          // needed no database change — richText is stored as one JSON
          // blob regardless of which node types appear inside it, unlike
          // the earlier textarea → richText swap, which changed the
          // column's actual storage type.
          name: "body",
          type: "richText",
          editor: lexicalEditor({
            features: [
              ParagraphFeature(),
              BoldFeature(),
              ItalicFeature(),
              LinkFeature(),
              UnorderedListFeature(),
              OrderedListFeature(),
              InlineToolbarFeature(),
            ],
          }),
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
