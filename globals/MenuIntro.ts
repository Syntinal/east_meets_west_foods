import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The text box above the menu grid on /menu (heading + intro paragraph) —
// previously hardcoded in components/menu/MenuGridView.tsx. Same singleton-
// Global + drafts + Live Preview shape as globals/Sauce.ts. The "Menu"
// eyebrow label stays hardcoded in MenuGridView (matches lib/navigation.ts's
// nav label, same as Sauce/Story keep their own eyebrow hardcoded) — only
// the headline and intro copy become admin-editable.
//
// Menu Items themselves stay a Collection (collections/MenuItems.ts) with
// its own Live Preview session (components/menu/LiveMenuGrid.tsx) — this is
// deliberately a *separate* doc/session so editing the intro box and editing
// a dish never run two useLivePreview subscriptions on the same /menu
// preview at once. See the /next/preview route comment for why that matters.
export const MenuIntro: GlobalConfig = {
  slug: "menu-intro",
  // Shows as "Menu Intro" in the /admin sidebar — distinct from the "Menu"
  // label already used by the MenuItems collection (see SitePagesNav).
  label: "Menu Intro",
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
    preview: () => getPreviewURL("/menu"),
    livePreview: {
      url: () => getPreviewURL("/menu"),
      openByDefault: true,
    },
    components: {
      // Globals shape this differently from Collections — `elements`, not
      // `edit` (see globals/Home.ts for the fuller explanation).
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/menu")],
  },
  fields: [
    {
      name: "heading",
      type: "text",
      defaultValue: "East Meets West Menu",
      admin: { description: "Headline shown above the menu." },
    },
    {
      name: "lede",
      type: "textarea",
      defaultValue:
        "Three offerings, made well — dumpling flavors change weekly. One of the Sandpoint area's only spots for authentic hand-folded Northern Chinese dumplings, in Ponderay.",
      admin: { description: "Short intro paragraph shown under the headline." },
    },
  ],
};
