import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The text box above the post list on /news (eyebrow + heading + lede),
// plus the empty-state message and the per-post "Read more" link text —
// all previously hardcoded in app/(frontend)/news/page.tsx. Same singleton-
// Global + drafts + Live Preview shape as globals/MenuIntro.ts. Individual
// News posts stay a Collection (collections/News.ts) with their own
// Live Preview session on their own /news/[slug] page — this is a
// deliberately separate doc/session, mirroring Menu Items vs. Menu Intro.
export const NewsIntro: GlobalConfig = {
  slug: "news-intro",
  // Shows as "News Intro" in the /admin sidebar — distinct from the "News"
  // label already used by the News collection (see SitePagesNav).
  label: "News Intro",
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
    // globals/Home.ts's comment for the fuller explanation. This doesn't
    // get its own row in Site Pages (components/admin/SitePagesNav.tsx)
    // either — "News" is one site page, and this is a second document
    // backing part of it, same reasoning as globals/MenuIntro.ts. Reached
    // instead via an edit-link notice at the top of the News list view
    // (components/admin/EditNewsIntroLink.tsx, mirrors EditMenuIntroLink).
    group: false,
    preview: () => getPreviewURL("/news"),
    livePreview: {
      url: () => getPreviewURL("/news"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/news")],
  },
  fields: [
    { name: "eyebrow", type: "text", defaultValue: "News", admin: { description: "Small label above the heading." } },
    {
      name: "heading",
      type: "text",
      defaultValue: "Announcements & Updates",
      admin: { description: "Headline shown above the post list." },
    },
    {
      name: "lede",
      type: "textarea",
      defaultValue: "What's new at East Meets West — announcements, seasonal flavors, and updates from Ponderay.",
      admin: { description: "Short intro paragraph shown under the headline." },
    },
    {
      name: "emptyStateMessage",
      type: "text",
      defaultValue: "Nothing posted yet — check back soon.",
      admin: { description: "Shown instead of the post list when there are no posts yet." },
    },
    {
      name: "readMoreText",
      type: "text",
      defaultValue: "Read more →",
      admin: { description: "Link text on each post card." },
    },
  ],
};
