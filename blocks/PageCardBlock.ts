import type { Block } from "payload";

// One of the homepage teaser cards that links to one of this site's own
// built-in pages (Menu/Sauce/Story/News) — home page only, not part of the
// generic Pages block picker (see globals/Home.ts's top comment for why).
// The heading comes from the Navigation global's label for `page` (via
// lib/navigation.ts's resolveNavLabel), not a field here, so it always
// matches the site's own nav label for that page — see
// components/home/TeaserCards.tsx.
//
// The News variant is special: its `image`/`body` fields are hidden below
// (via `admin.condition`) and never read at render time — it always shows
// the most recent News post's own photo/excerpt instead, kept fresh
// automatically without the owner needing to separately update this card
// every time they publish. See app/(frontend)/page.tsx's
// getLatestNewsPost() and components/home/TeaserCards.tsx. `newsFallbackImage`
// (shown only for the News option) covers the case where that post has no
// featured photo of its own — without it, the card's photo area
// (`.teaser-card-img`, a reserved 4:3 box) would render empty.
export const PageCardBlock: Block = {
  slug: "pageCard",
  labels: { singular: "Page Card (Menu/Sauce/Story/News)", plural: "Page Cards" },
  fields: [
    {
      name: "page",
      type: "select",
      required: true,
      options: [
        { label: "Menu", value: "menu" },
        { label: "The Sauce", value: "sauce" },
        { label: "Our Story", value: "story" },
        { label: "News", value: "news" },
      ],
      admin: {
        description:
          "Which page this card links to. The News card automatically shows the most recent News post's own " +
          "photo and excerpt (see below) and only appears at all once there's a post to show.",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      admin: {
        description: "Landscape or square, at least 800×600px.",
        condition: (_, siblingData) => siblingData?.page !== "news",
      },
    },
    {
      name: "body",
      type: "textarea",
      admin: {
        description: "Short blurb shown on the card.",
        condition: (_, siblingData) => siblingData?.page !== "news",
      },
    },
    {
      name: "newsFallbackImage",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      label: "Fallback photo (News only)",
      admin: {
        description: "Used only when the most recent News post doesn't have its own featured photo.",
        condition: (_, siblingData) => siblingData?.page === "news",
      },
    },
    { name: "ctaText", type: "text", defaultValue: "Learn More →", admin: { description: "The link text at the bottom of the card." } },
  ],
};
