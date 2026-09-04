"use client";

import { useState } from "react";

type TestimonialDoc = { quote: string; authorName: string; rating: string; sourceUrl?: string | null };

const PAGE_SIZE = 4;

export default function TestimonialCarousel({ testimonials }: { testimonials: TestimonialDoc[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(testimonials.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = testimonials.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="testimonial-grid">
        {visible.map((testimonial, index) => (
          <figure className="testimonial-card" key={start + index}>
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

      {pageCount > 1 && (
        <div className="testimonial-nav">
          <button
            type="button"
            className="testimonial-arrow"
            onClick={() => setPage((current) => current - 1)}
            disabled={page === 0}
            aria-label="Previous testimonials"
          >
            ←
          </button>
          <span className="testimonial-nav-count">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="testimonial-arrow"
            onClick={() => setPage((current) => current + 1)}
            disabled={page === pageCount - 1}
            aria-label="Next testimonials"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
