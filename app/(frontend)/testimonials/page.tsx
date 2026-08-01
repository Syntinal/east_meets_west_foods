import type { Metadata } from "next";
import { cookies, draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { TestimonialsView, type TestimonialDoc } from "@/components/testimonials/TestimonialsView";
import { LiveTestimonialsGrid } from "@/components/testimonials/LiveTestimonialsGrid";

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
  const { isEnabled: isDraftMode } = await draftMode();
  // Set as a cookie by /next/preview rather than read from a query string —
  // Vercel strips searchParams during ISR bypass even in Draft Mode, but
  // cookies survive (see lib/preview.ts).
  const livePreviewId = isDraftMode ? (await cookies()).get("live-preview-id")?.value : undefined;
  // Postgres ids come back as numbers, but the cookie value is always a
  // string — compare as strings on both sides rather than relying on ===.
  const seedItem = livePreviewId ? testimonials.find((item) => String(item.id) === livePreviewId) : undefined;

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

            {isDraftMode && seedItem ? (
              <LiveTestimonialsGrid initialItems={testimonials} seedItem={seedItem} />
            ) : (
              <TestimonialsView testimonials={testimonials} />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
