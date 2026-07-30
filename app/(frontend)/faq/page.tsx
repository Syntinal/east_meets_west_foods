import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "FAQ — East Meets West Dumplings Bar near Sandpoint, ID";
const description =
  "Common questions about East Meets West Dumplings Bar in Ponderay, ID — near Sandpoint. Hand-folded Northern Chinese dumplings, bao buns, allergens, location, and menu pricing answered.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/faq" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/faq",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg",
        alt: "A tray of freshly steamed bao buns, golden and ready to serve",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is East Meets West Dumplings Bar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "East Meets West Dumplings Bar is a restaurant in Ponderay, Idaho specializing in authentic hand-folded Northern Chinese dumplings and bao buns, served with homemade garlic sauce at fast-food prices and service levels.",
      },
    },
    {
      "@type": "Question",
      name: "Where is East Meets West Dumplings Bar located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "East Meets West Dumplings Bar is located at 476534 US HWY 95, Suite B, Ponderay, ID 83852 — just a few minutes from downtown Sandpoint, serving the greater Sandpoint and Bonner County area.",
      },
    },
    {
      "@type": "Question",
      name: "Are you near Sandpoint?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — we're in Ponderay, Idaho, which is just a short drive (about 2 miles) north of downtown Sandpoint. The restaurant is easy to reach from anywhere in the Sandpoint–Ponderay area and throughout Bonner County.",
      },
    },
    {
      "@type": "Question",
      name: "What is on the menu?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The menu features Pork and Vegetable Bao Buns, Pork and Vegetable Dumplings, and Combination platters (buns and dumplings together). Items are priced at $7.99 for 3, $13.99 for 6, and $24.99 for 12. Combination platters are $13.99 (3+3) or $24.99 (6+6). Add a side of fried rice (or other side) to any meal for $3, or $3.99 alone. Extra garlic sauce is $1.50. Drinks are $0.99–$4.99, and imported Asian snacks are $3–$6. Dumpling flavors change weekly.",
      },
    },
    {
      "@type": "Question",
      name: "What makes the dumplings authentic?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The recipes are passed down through generations of Mongol and Haan ancestry near the Mongolian and Russian border in Northern China. The pork is sourced fresh from Wood's Meats, and the bao buns use authentic Chinese fermented dough. All items are hand-folded daily.",
      },
    },
    {
      "@type": "Question",
      name: "Are there allergen or dietary considerations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. East Meets West's food contains gluten and soy-based products (including soy sauce and soy oil) as part of maintaining authenticity. Guests with gluten or soy allergies should be aware before ordering.",
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={restaurantSchema} />
      <JsonLd data={faqSchema} />

      <main>
        <section className="section faq-section" aria-labelledby="faq-heading">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">FAQ</p>
              <h1 id="faq-heading" className="section-title">Frequently Asked Questions</h1>
            </header>
            <div className="text-panel text-panel--faq">
              <dl className="faq-list">
                <div className="faq-item">
                  <dt className="faq-question">What is East Meets West Dumplings Bar?</dt>
                  <dd className="faq-answer">
                    East Meets West Dumplings Bar is a restaurant in Ponderay, Idaho dedicated to authentic, hand-folded Northern Chinese dumplings and bao buns. Every item is made fresh daily and served with our signature homemade garlic sauce — all at fast-food prices.
                  </dd>
                </div>

                <div className="faq-item">
                  <dt className="faq-question">Where are you located?</dt>
                  <dd className="faq-answer">
                    We&apos;re at <strong>476534 US HWY 95, Suite B, Ponderay, ID 83852</strong> — in Ponderay, Idaho, just a few minutes from downtown Sandpoint, serving the greater Sandpoint and Bonner County area. See our{" "}
                    <Link href="/contact">Contact page</Link> for a map and directions.
                  </dd>
                </div>

                <div className="faq-item">
                  <dt className="faq-question">Are you near Sandpoint?</dt>
                  <dd className="faq-answer">
                    Yes — we&apos;re in Ponderay, Idaho, about 2 miles north of downtown Sandpoint. It&apos;s a quick drive from anywhere in the Sandpoint–Ponderay area, and we&apos;re easy to find right on US HWY 95.
                  </dd>
                </div>

                <div className="faq-item">
                  <dt className="faq-question">What&apos;s on the menu?</dt>
                  <dd className="faq-answer">
                    We offer Pork &amp; Vegetable Bao Buns, Pork &amp; Vegetable Dumplings, and Combination platters — all priced at $7.99 (3 pieces), $13.99 (6 pieces), or $24.99 (12 pieces). Combination platters pair buns and dumplings together. Add a side of fried rice (or other side) to any meal for $3 — or $3.99 on its own — and extra garlic sauce is $1.50. Drinks run $0.99–$4.99, and we carry imported Asian snacks ($3–$6). Dumpling flavors rotate weekly, so there&apos;s always something new to try.
                  </dd>
                </div>

                <div className="faq-item">
                  <dt className="faq-question">What makes the dumplings authentic?</dt>
                  <dd className="faq-answer">
                    Our recipes are drawn from generations of Mongol and Haan ancestry near the Mongolia–Russia border in Northern China — passed down through Chef Richard&apos;s family. Pork is sourced fresh from Wood&apos;s Meats, and our bao buns use authentic Chinese fermented dough for that characteristic chew. Every piece is hand-folded in-house daily.
                  </dd>
                </div>

                <div className="faq-item">
                  <dt className="faq-question">Do you have vegetarian options or allergen information?</dt>
                  <dd className="faq-answer">
                    Our current dumplings and bao buns contain pork. The food also contains <strong>gluten and soy-based products</strong> (soy sauce, soy oil, etc.) as part of maintaining authenticity — guests with gluten or soy sensitivities should be aware before ordering.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
