// The eyebrow + heading above the testimonial grid is backed by its own
// Global (globals/TestimonialsIntro.ts) — a separate Payload document from
// the Testimonials list this renders alongside. Mirrors
// components/admin/EditMenuIntroLink.tsx exactly, including why this
// doesn't get its own Site Pages row (see that file's comment).
export function EditTestimonialsIntroLink() {
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
      <a href="/admin/globals/testimonials-intro" className="btn btn--style-secondary">
        Edit intro text →
      </a>
      <span style={{ fontSize: 13, opacity: 0.7 }}>
        Edit the eyebrow and heading shown above the testimonials.
      </span>
    </div>
  );
}
