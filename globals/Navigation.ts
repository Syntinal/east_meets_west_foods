import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { NAV_PAGES } from "@/lib/navigation";

// One checkbox per known page, plus editable label text per page. Unchecking
// a page removes it from the nav menu (top and footer) only — the page
// itself keeps working for anyone with a direct link.
//
// The `{key}Label`/`{key}ShortLabel` fields are additive siblings of the
// original `{key}` checkboxes (not a restructure into a group per page) —
// deliberately, so this schema change is pure addition and doesn't hit the
// Drizzle interactive rename-prompt gotcha documented in CLAUDE.md (that
// one specifically needs an add+remove of similarly-shaped columns in the
// same pass). Fall back to NAV_PAGES's own label/shortLabel via
// resolveNavLabel() (lib/navigation.ts) when left blank. These labels also
// drive the matching teaser-card headings on the Home page
// (see globals/Home.ts) and the FAQ/Testimonials nav tabs — one edit here,
// not several.
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
    group: "Site Settings",
    description:
      "Choose which pages show up in the site's navigation, and edit their labels. Unchecking a page hides it from the menu — the page itself still works if someone has the direct link.",
  },
  fields: [
    ...NAV_PAGES.flatMap((page) => [
      {
        name: page.key,
        type: "checkbox" as const,
        label: `Show "${page.label}"`,
        defaultValue: true,
      },
      {
        name: `${page.key}Label`,
        type: "text" as const,
        label: `"${page.label}" nav label`,
        defaultValue: page.label,
        admin: { description: "Shown in the nav menu, and anywhere else this page is referred to by name." },
      },
      {
        name: `${page.key}ShortLabel`,
        type: "text" as const,
        label: `"${page.label}" short label (footer)`,
        defaultValue: page.shortLabel ?? "",
        admin: { description: "Optional — a shorter version for the compact footer menu. Leave blank to reuse the label above." },
      },
    ]),
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
    {
      type: "group",
      name: "reviewLink",
      admin: { description: 'The "Leave a Review" link shown in the site nav.' },
      fields: [
        { name: "text", type: "text", label: "Link text", defaultValue: "Leave a Review" },
        {
          name: "url",
          type: "text",
          label: "Google Review URL",
          defaultValue:
            "https://www.google.com/maps/place//data=!4m3!3m2!1s0x5363d1966a6b04e9:0x6d04125dba42b761!12e1",
          admin: {
            description: "The link visitors land on to leave a Google review — normally shouldn't need to change.",
          },
        },
      ],
    },
  ],
};
