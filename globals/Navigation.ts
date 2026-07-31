import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { NAV_PAGES } from "@/lib/navigation";

// One checkbox per known page. Unchecking a page removes it from the nav
// menu (top and footer) only — the page itself keeps working for anyone
// with a direct link.
export const Navigation: GlobalConfig = {
  slug: "navigation",
  access: {
    read: () => true,
    update: authenticated,
  },
  hooks: {
    // Every page shares this nav via the root layout — revalidating the
    // "layout" path busts the cache for the whole site, not just one route.
    afterChange: [() => revalidatePath("/", "layout")],
  },
  admin: {
    description:
      "Choose which pages show up in the site's navigation. Unchecking a page hides it from the menu — the page itself still works if someone has the direct link.",
  },
  fields: [
    ...NAV_PAGES.map((page) => ({
      name: page.key,
      type: "checkbox" as const,
      label: `Show "${page.label}"`,
      defaultValue: true,
    })),
    {
      name: "newsTeaser",
      type: "checkbox" as const,
      label: 'Show the "News" teaser card on the homepage',
      defaultValue: true,
      admin: { description: "Turn this off when there's nothing worth featuring on the homepage." },
    },
    {
      name: "testimonialsSection",
      type: "checkbox" as const,
      label: "Show the Testimonials section on the homepage",
      defaultValue: true,
      admin: {
        description:
          'Turn this off when there aren\'t any testimonials worth featuring yet. This is separate from the "Show \'Testimonials\'" checkbox above, which controls the nav tab and the full /testimonials page.',
      },
    },
  ],
};
