export type TestimonialDoc = {
  id: string;
  quote: string;
  authorName: string;
  rating: string;
  sourceUrl?: string | null;
};

// Shared between the plain server-rendered /testimonials page and its
// live-preview counterpart — same markup either way, just fed different data.
export function TestimonialsView({ testimonials }: { testimonials: TestimonialDoc[] }) {
  if (testimonials.length === 0) {
    return <p className="muted-text">No testimonials posted yet — check back soon.</p>;
  }

  return (
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
  );
}
