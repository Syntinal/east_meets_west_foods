import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The FAQ page, previously hand-coded HTML with two independently-typed
// copies of the same 6 answers (one for the visible <dl>, one hardcoded
// inside a FAQPage JSON-LD object) — see app/(frontend)/faq/page.tsx.
// `questions` here is the single source of truth for both now: the page
// renders it directly, and builds the JSON-LD `mainEntity` from the same
// array (richText answers flattened to plain text — see
// lib/richTextToPlainText.ts).
export const Faq: GlobalConfig = {
  slug: "faq",
  label: "FAQ",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    preview: () => getPreviewURL("/faq"),
    livePreview: {
      url: () => getPreviewURL("/faq"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/faq")],
  },
  fields: [
    { name: "heading", type: "text", admin: { description: "The page heading, above the question list." } },
    {
      name: "questions",
      type: "array",
      minRows: 1,
      admin: {
        description:
          "Add, remove, or reorder questions. Each one also feeds the page's search-engine FAQ markup — no separate copy to keep in sync.",
      },
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "richText", required: true },
      ],
    },
  ],
};
