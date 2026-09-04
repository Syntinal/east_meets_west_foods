export type TestimonialDoc = {
  id: string;
  quote: string;
  authorName: string;
  rating: string;
  sourceUrl?: string | null;
};

// The eyebrow + heading above the grid — backed by globals/TestimonialsIntro.ts.
export type TestimonialsIntroDoc = { eyebrow?: string | null; heading?: string | null };

// Shared between the plain server-rendered /testimonials page and its
// live-preview counterpart — same markup either way, just fed different
// data. Mirrors components/menu/MenuGridView.tsx's split between editable
// chrome (`intro`) and a plain server-fetched list (`testimonials`).
export function TestimonialsView({
  testimonials,
  intro,
}: {
  testimonials: TestimonialDoc[];
  intro: TestimonialsIntroDoc;
}) {
  return (
    <>
      <header className="section-head">
        <div className="text-panel text-panel--inline">
          <p className="eyebrow">{intro.eyebrow}</p>
          <h1 className="section-title">{intro.heading}</h1>
        </div>
      </header>

      {testimonials.length === 0 ? (
        <p className="muted-text">No testimonials posted yet — check back soon.</p>
      ) : (
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <figure className="testimonial-card" key={testimonial.id}>
              <div className="testimonial-stars" aria-label={`${testimonial.rating} out of 5 stars`}>
                {"★".repeat(Number(testimonial.rating))}
                {"☆".repeat(5 - Number(testimonial.rating))}
              </div>
              <blockquote className="testimonial-quote">&ldquo;{testimonial.quote}&rdquo;</blockquote>
              <figcaption className="testimonial-author">
                {testimonial.sourceUrl ? (
                  <a href={testimonial.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {testimonial.authorName}
                  </a>
                ) : (
                  testimonial.authorName
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
