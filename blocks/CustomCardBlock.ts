import type { Block } from "payload";

// A genuinely new homepage teaser card, pointing anywhere the owner wants
// — home page only, not part of the generic Pages block picker (see
// globals/Home.ts's top comment for why). `href` mirrors
// blocks/CallToActionBlock.ts's `buttonHref` field exactly (plain text,
// not a relationship picker — internal path, tel:/mailto:, or full URL).
export const CustomCardBlock: Block = {
  slug: "customCard",
  labels: { singular: "Custom Card", plural: "Custom Cards" },
  fields: [
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      admin: { description: "Landscape or square, at least 800×600px." },
    },
    { name: "heading", type: "text", required: true },
    { name: "body", type: "textarea", admin: { description: "Short blurb shown on the card." } },
    { name: "ctaText", type: "text", defaultValue: "Learn More →", admin: { description: "The link text at the bottom of the card." } },
    {
      name: "href",
      type: "text",
      required: true,
      label: "Card link",
      admin: {
        description:
          'Where the whole card links to — e.g. "/catering" (a Page you\'ve created), "tel:+12086276283", "mailto:someone@example.com", or a full https:// link.',
      },
    },
  ],
};
