import type { Payload } from "payload";

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
const FIXED_PAGES = [
  { label: "Home", href: "/admin/globals/home" },
  { label: "Menu", href: "/admin/collections/menu-items" },
  { label: "The Sauce", href: "/admin/globals/sauce" },
  { label: "Our Story", href: "/admin/globals/story" },
  { label: "News", href: "/admin/collections/news-posts" },
  { label: "Testimonials", href: "/admin/collections/testimonials" },
  { label: "FAQ", href: "/admin/globals/faq" },
  { label: "Contact", href: "/admin/globals/contact" },
];

// Fixed entries get an implicit order (0, 10, 20, …) — the same scheme
// getVisiblePages() in app/(frontend)/layout.tsx uses for the real site
// nav — so a published Page's own `navigation.navOrder` can slot it in
// anywhere among them and this admin shortcut list ends up ordered exactly
// like the live site, not just "fixed 8, then whatever's new tacked on
// the end."
const ORDER_STEP = 10;

type PageDoc = {
  id: string | number;
  title?: string | null;
  navigation?: { navLabel?: string | null; navOrder?: number | null } | null;
};

// `payload` arrives for free here — Payload's beforeNavLinks slot passes
// the resolved Local API instance into serverProps for any RSC registered
// there (confirmed via node_modules/@payloadcms/next/dist/elements/Nav/
// index.js), same mechanism ListPreviewView/EmptyDraftsNotice rely on for
// their own `data` props, just a different prop on this slot. So this can
// query the `pages` collection itself instead of needing a separate fetch
// wired up elsewhere.
export async function SitePagesNav({ payload }: { payload: Payload }) {
  // Published only — mirrors getVisiblePages()'s non-draft-mode branch, so
  // this list reflects what's actually live on the site (same reasoning
  // the owner gave for wanting this section in the first place: a
  // page-by-page mirror of the real site, "like the old site"). Draft
  // pages stay reachable via the plain "Pages" collection list under Site
  // Settings until published.
  const { docs } = await payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  const dynamicEntries = (docs as PageDoc[]).map((doc) => ({
    label: doc.navigation?.navLabel || doc.title || "Untitled",
    href: `/admin/collections/pages/${doc.id}`,
    order: typeof doc.navigation?.navOrder === "number" ? doc.navigation.navOrder : 100,
  }));

  const entries = [
    ...FIXED_PAGES.map((page, i) => ({ ...page, order: i * ORDER_STEP })),
    ...dynamicEntries,
  ].sort((a, b) => a.order - b.order);

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
        {entries.map((page) => (
          <a key={page.href} className="nav__link" href={page.href}>
            <span className="nav__link-label">{page.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
