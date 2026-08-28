import type { Block } from "payload";
import { mapCardThumbnail } from "@/lib/blockIcons";

// The "Visit / Contact" teaser card — home page only, not part of the
// generic Pages block picker (see globals/Home.ts's top comment for why).
// The Google Maps embed and its fixed /contact link stay hardcoded in the
// renderer (components/home/TeaserCards.tsx) — same "developer needed to
// move the pin" reasoning already documented on globals/Contact.ts.
export const MapCardBlock: Block = {
  slug: "mapCard",
  labels: { singular: "Map Card (Visit / Contact)", plural: "Map Cards" },
  admin: { images: { thumbnail: mapCardThumbnail } },
  fields: [
    { name: "heading", type: "text", defaultValue: "Visit / Contact" },
    {
      name: "body",
      type: "textarea",
      defaultValue: "476534 US HWY 95, Suite B — Ponderay, ID 83852.",
      maxLength: 130,
      admin: {
        description:
          "Shown under the heading — keep it to about 3 lines (130 characters max). Doesn't affect the map itself — see the field's comment in code.",
      },
    },
    { name: "ctaText", type: "text", defaultValue: "Get Directions →" },
  ],
};
