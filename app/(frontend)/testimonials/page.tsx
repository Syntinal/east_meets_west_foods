import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "Testimonials — East Meets West Dumplings Bar";
const description =
  "What customers are saying about East Meets West Dumplings Bar in Ponderay, Idaho — near Sandpoint.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/testimonials" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/testimonials",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

type TestimonialDoc = { quote: string; authorName: string; rating: string; sourceUrl?: string | null };

async function getTestimonials(): Promise<TestimonialDoc[]> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "testimonials",
    draft: isDraftMode,
    // Local API bypasses access control by default, so `draft` alone won't
    // hide never-published drafts — filter explicitly.
    where: isDraftMode ? {} : { _status: { equals: "published" } },
    sort: "order",
    limit: 100,
  });
  return result.docs as unknown as TestimonialDoc[];
}

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials();

  return (
    <>
      <JsonLd data={restaurantSchema} />

      <main>
        <section className="section">
          <div className="container">
            <header className="section-head">
              <div className="text-panel text-panel--inline">
                <p className="eyebrow">What People Are Saying</p>
                <h1 className="section-title">Testimonials</h1>
              </div>
            </header>

            {testimonials.length === 0 ? (
              <p className="muted-text">No testimonials posted yet — check back soon.</p>
            ) : (
              <div className="testimonial-grid">
                {testimonials.map((testimonial, index) => (
                  <figure className="testimonial-card" key={index}>
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
          </div>
        </section>
      </main>
    </>
  );
}
