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
