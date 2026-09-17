import type { Block } from "payload";
import { quoteThumbnail } from "@/lib/blockIcons";

// A featured quote or testimonial on a self-service Page — reuses the
// site's existing .pull-quote treatment verbatim (see StoryView.tsx/
// SauceView.tsx and app/(frontend)/globals.css's "PULL QUOTE" section),
// previously only available on the two hardcoded Sauce/Story pages.
export const QuoteBlock: Block = {
  slug: "quote",
  labels: { singular: "Quote", plural: "Quote Blocks" },
  admin: { images: { thumbnail: quoteThumbnail } },
  fields: [
    {
      name: "quote",
      type: "textarea",
      required: true,
      admin: { description: "The quote text." },
    },
    {
      name: "citation",
      type: "text",
      admin: { description: 'Optional — who said it, e.g. "— Jane, Customer".' },
    },
  ],
};
