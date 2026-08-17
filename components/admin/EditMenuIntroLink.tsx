// The box above the menu grid (heading + intro paragraph) is backed by its
// own Global (globals/MenuIntro.ts) — a separate Payload document from the
// Menu Items list this renders alongside. It deliberately does NOT get its
// own row in Site Pages (components/admin/SitePagesNav.tsx): the owner
// wants Site Pages divided one-entry-per-*site-page*, not per-document, and
// "Menu" is one page. This surfaces the edit link here instead, the same
// way GoogleReviewsLink is folded into the Testimonials entry rather than
// getting a nav entry of its own.
export function EditMenuIntroLink() {
  return (
    <div
      style={{
        border: "1px solid var(--theme-elevation-150, #ddd)",
        borderRadius: 4,
        padding: 16,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <a href="/admin/globals/menu-intro" className="btn btn--style-secondary">
        Edit intro text →
      </a>
      <span style={{ fontSize: 13, opacity: 0.7 }}>
        Edit the heading and paragraph shown above the menu, plus the two
        footer notes at the bottom of the page.
      </span>
    </div>
  );
}
