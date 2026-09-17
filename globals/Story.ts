import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The Our Story page, previously hand-coded HTML — now editable. Same
// shape as globals/Sauce.ts / globals/Home.ts; see Home's header comment
// for the full reasoning. <title>/meta/OG/Twitter/JSON-LD stay hardcoded
// in app/(frontend)/story/page.tsx — only body copy + photo are editable.
//
// Piloting the "make the editing screen read more like the page, in plain
// language" pass here first (owner asked for editing to feel more like a
// Word document; see the private editing-roadmap artifact for the full
// staged plan) before rolling it out to Sauce/FAQ/Contact/Home, which all
// share this exact shape and have the same gaps. What changed for this
// pilot: every group got a plain-language label + description (previously
// only some individual fields did — `pullQuote` had none at all), and a
// top-level `admin.description` was added so the edit screen opens with a
// one-line explanation of what the whole page controls. The field order
// below was already checked against components/story/StoryView.tsx's
// actual render order (photo, then heading, then body, then pull-quote)
// and needed no change — it already reads top-to-bottom the same way the
// live page does.
export const Story: GlobalConfig = {
  slug: "story",
  label: "Our Story",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    description: "The photo, headline, and story text on the Our Story page, plus an optional highlighted quote at the end.",
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    preview: () => getPreviewURL("/story"),
    livePreview: {
      url: () => getPreviewURL("/story"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/story")],
  },
  fields: [
    {
      type: "group",
      name: "hero",
      label: "Photo",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          filterOptions: { mimeType: { contains: "image" } },
          admin: { description: "The photo shown next to the story, on the left." },
        },
      ],
    },
    {
      type: "group",
      name: "content",
      label: "Story Text",
      admin: { description: "The headline and paragraphs that make up the story." },
      fields: [
        { name: "heading", type: "text", admin: { description: "The big headline at the top of the page." } },
        {
          name: "body",
          type: "richText",
          admin: { description: "The main story copy. Use the toolbar to add bold text, headings, links, and lists." },
        },
      ],
    },
    {
      type: "group",
      name: "pullQuote",
      label: "Pull Quote (Optional)",
      admin: {
        description: "A short quote shown in large, highlighted type at the end of the story. Leave both fields blank to hide this section entirely.",
      },
      fields: [
        { name: "quote", type: "text", admin: { description: "The quote itself." } },
        { name: "citation", type: "text", admin: { description: 'Who said it, e.g. "— Richard, Chef".' } },
      ],
    },
  ],
};
