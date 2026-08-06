// Rendered above Payload's default Collections/Globals sidebar sections
// (registered via admin.components.beforeNavLinks in payload.config.ts) —
// a flat, site-page-ordered quick list. Payload's own `admin.group` can
// merge a Collection and a Global into one labeled section, but always
// lists every grouped collection before every grouped global regardless of
// config order (confirmed from
// node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js) — it can't
// interleave "Home" (a global), "Menu" (a collection), "The Sauce" (a
// global), etc. into the site's actual page order. This list is what
// carries that exact order.
//
// Uses Payload's own nav CSS classes (`nav-group`, `nav-group__label`,
// `nav__link`, `nav__link-label` — confirmed against
// node_modules/@payloadcms/next/dist/elements/Nav/index.client.js, the
// component that renders the real Collections/Globals groups) instead of
// hand-guessed padding, so this lines up with the rest of the sidebar
// exactly rather than approximately — a first pass here used its own
// inline padding and came out visibly misaligned from every other section.
const PAGES = [
  { label: "Home", href: "/admin/globals/home" },
  { label: "Menu", href: "/admin/collections/menu-items" },
  { label: "The Sauce", href: "/admin/globals/sauce" },
  { label: "Our Story", href: "/admin/globals/story" },
  { label: "News", href: "/admin/collections/news-posts" },
  { label: "Testimonials", href: "/admin/collections/testimonials" },
  { label: "FAQ", href: "/admin/globals/faq" },
  { label: "Contact", href: "/admin/globals/contact" },
];

export function SitePagesNav() {
  return (
    <div className="nav-group">
      {/* Same DOM shape as Payload's real NavGroup (nav-group__toggle
          wrapping nav-group__label, nav-group__content wrapping the
          links) minus the click-to-collapse behavior — this isn't
          collapsible, so a plain div stands in for NavGroup's <button>. */}
      <div className="nav-group__toggle">
        <div className="nav-group__label">Site Pages</div>
      </div>
      <div className="nav-group__content">
        {PAGES.map((page) => (
          <a key={page.href} className="nav__link" href={page.href}>
            <span className="nav__link-label">{page.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
