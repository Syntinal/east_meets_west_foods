import type { Block } from "payload";
import { faqThumbnail } from "@/lib/blockIcons";

// A small, self-contained question/answer section on any self-service
// Page (e.g. a Catering page's own "how far in advance do I need to
// order?" questions) — separate from the site's single main FAQ page
// (globals/Faq.ts). Reuses that page's exact markup/CSS (.faq-list/
// .faq-item/.faq-question/.faq-answer, see components/faq/FaqView.tsx),
// including the same default full richText editor on `answer` (matching
// globals/Faq.ts's own `answer` field — not scoped down the way
// CardGridBlock's body is, since an FAQ answer is real paragraph content,
// not a short caption on a small repeating card).
export const FaqBlock: Block = {
  slug: "faq",
  labels: { singular: "Mini FAQ", plural: "Mini FAQ Blocks" },
  admin: { images: { thumbnail: faqThumbnail } },
  fields: [
    {
      name: "heading",
      type: "text",
      admin: { description: "Optional heading shown above the questions." },
    },
    {
      name: "questions",
      type: "array",
      minRows: 1,
      admin: { description: "Add, remove, or reorder questions." },
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "richText", required: true },
      ],
    },
  ],
};
