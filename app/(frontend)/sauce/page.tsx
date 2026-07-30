import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "The Homemade Garlic Sauce — East Meets West near Sandpoint, ID";
const description =
  "East Meets West's homemade garlic sauce is made from scratch to complement every dumpling and bao bun. Robust, deeply flavored, and unique to the Sandpoint–Ponderay area.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/sauce" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description:
      "Made from scratch and deeply flavored, our homemade garlic sauce complements hand-folded Northern Chinese dumplings and bao buns. A Sandpoint–Ponderay original.",
    url: "https://eastmeetswestfoods.co/sauce",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg",
        alt: "Fresh dumplings on a tray, ready to be served with homemade garlic sauce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Made from scratch — our robust homemade garlic sauce is the perfect companion to hand-folded Northern Chinese dumplings and bao buns in Ponderay near Sandpoint.",
    images: ["https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg"],
  },
};

export default function SaucePage() {
  return (
    <>
      <JsonLd data={restaurantSchema} />

      <main>
        <section className="section">
          <div className="container sauce-grid">
            <div className="sauce-text text-panel">
              <p className="eyebrow">The Sauce</p>
              <h1 className="section-title">The secret is in the sauce.</h1>
              <p>
                Homemade and delicious garlic sauce that greatly complements the
                taste of the buns and dumplings. Please note: the sauce is quite
                robust and does not require a lot to have the desired effect.
              </p>
              <p>
                Cut a small slit in the dumpling or bun and add a little sauce — or
                simply dip the product into the sauce. A little goes a long way.
              </p>
              <p>
                Every meal comes with garlic sauce included — want more? Extra
                sauce is $1.50.
              </p>
              <p>
                Made fresh in Ponderay, Idaho — part of what makes us a one-of-a-kind stop for authentic Chinese food near Sandpoint.
              </p>
              <blockquote className="pull-quote">
                <p>&quot;The secret is in the sauce.&quot;</p>
                <cite>— Roger, Owner</cite>
              </blockquote>
            </div>
            <div className="sauce-photo">
              <img
                src="/assets/photos/dumplings-tray.jpeg"
                alt="Fresh hand-folded Northern Chinese dumplings on a tray, served with homemade garlic sauce"
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
