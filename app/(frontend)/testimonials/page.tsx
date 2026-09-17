import type { Metadata } from "next";
import { cookies, draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { TestimonialsView, type TestimonialDoc, type TestimonialsIntroDoc } from "@/components/testimonials/TestimonialsView";
import { LiveTestimonialsGrid } from "@/components/testimonials/LiveTestimonialsGrid";
import { LiveTestimonialsIntro } from "@/components/testimonials/LiveTestimonialsIntro";

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

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getTestimonialsIntro(): Promise<TestimonialsIntroDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const intro = await payload.findGlobal({
    slug: "testimonials-intro",
    draft: isDraftMode,
    overrideAccess: true,
    depth: 0,
  });
  return intro as unknown as TestimonialsIntroDoc;
}

export default async function TestimonialsPage() {
  const [testimonials, intro] = await Promise.all([getTestimonials(), getTestimonialsIntro()]);
  const { isEnabled: isDraftMode } = await draftMode();
  // Set as a cookie by /next/preview rather than read from a query string —
  // Vercel strips searchParams during ISR bypass even in Draft Mode, but
  // cookies survive (see lib/preview.ts). Absent when previewing the
  // Testimonials Intro global instead of a specific testimonial — mirrors
  // /menu's livePreviewId handling exactly (see that page for the fuller
  // comment).
  const livePreviewId = isDraftMode ? (await cookies()).get("live-preview-id")?.value : undefined;
  // Postgres ids come back as numbers, but the cookie value is always a
  // string — compare as strings on both sides rather than relying on ===.
  const seedItem = livePreviewId ? testimonials.find((item) => String(item.id) === livePreviewId) : undefined;

  // Exactly one useLivePreview subscription per session — same reasoning
  // as /menu's body branch.
  let body;
  if (isDraftMode && seedItem) {
    body = <LiveTestimonialsGrid initialItems={testimonials} seedItem={seedItem} intro={intro} />;
  } else if (isDraftMode) {
    body = <LiveTestimonialsIntro testimonials={testimonials} intro={intro} />;
  } else {
    body = <TestimonialsView testimonials={testimonials} intro={intro} />;
  }

  return (
    <>
      <JsonLd data={restaurantSchema} />

      <main>
        <section className="section">
          <div className="container">{body}</div>
        </section>
      </main>
    </>
  );
}
