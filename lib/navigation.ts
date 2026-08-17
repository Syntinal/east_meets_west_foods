// Single source of truth for the site's known pages — used both to build
// the Payload Navigation global's fields and to render the actual nav.
export type NavPage = {
  key: "home" | "menu" | "sauce" | "story" | "news" | "testimonials" | "faq" | "contact";
  href: string;
  label: string;
  // Shorter label for the compact footer nav, where "The Sauce"/"Our Story"
  // read as too long. Falls back to `label` when omitted.
  shortLabel?: string;
};

export const NAV_PAGES: NavPage[] = [
  { key: "home", href: "/", label: "Home" },
  { key: "menu", href: "/menu", label: "Menu" },
  { key: "sauce", href: "/sauce", label: "The Sauce", shortLabel: "Sauce" },
  { key: "story", href: "/story", label: "Our Story", shortLabel: "Story" },
  { key: "news", href: "/news", label: "News" },
  { key: "testimonials", href: "/testimonials", label: "Testimonials" },
  { key: "faq", href: "/faq", label: "FAQ" },
  { key: "contact", href: "/contact", label: "Contact" },
];

// Broader shape for anything Nav/Footer can render — the fixed NAV_PAGES
// entries above (which satisfy this structurally), plus admin-created
// Pages docs merged in at render time. See getVisiblePages in
// app/(frontend)/layout.tsx.
export type NavEntry = {
  key: string;
  href: string;
  label: string;
  shortLabel?: string;
};

// Resolves a NAV_PAGES entry's effective label/shortLabel against the
// Navigation global's `{key}Label`/`{key}ShortLabel` fields (see
// globals/Navigation.ts), falling back to NAV_PAGES's own hardcoded default
// when the admin field is blank/unset. Shared by app/(frontend)/layout.tsx
// (Nav/Footer) and app/(frontend)/page.tsx (Home's teaser card headings) so
// an edited nav label takes effect everywhere it's used, not just one place.
export function resolveNavLabel(
  page: NavPage,
  nav: Record<string, unknown> | null | undefined,
): { label: string; shortLabel?: string } {
  const label = (nav?.[`${page.key}Label`] as string | undefined) || page.label;
  const shortLabel = (nav?.[`${page.key}ShortLabel`] as string | undefined) || page.shortLabel;
  return { label, shortLabel };
}
