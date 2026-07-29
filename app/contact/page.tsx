import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "Find Us near Sandpoint — Ponderay, ID | East Meets West Dumplings Bar";
const description =
  "East Meets West Dumplings Bar is at 476534 US HWY 95, Suite B, Ponderay, ID 83852 — just minutes from downtown Sandpoint. Get directions and visit us today.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/contact" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description:
      "East Meets West Dumplings Bar is at 476534 US HWY 95, Suite B, Ponderay, ID 83852 — just minutes from downtown Sandpoint. Hand-folded Northern Chinese dumplings and bao buns.",
    url: "https://eastmeetswestfoods.co/contact",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/sign.jpeg",
        alt: "The East Meets West Dumplings Bar storefront sign in Ponderay, Idaho",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "476534 US HWY 95, Suite B, Ponderay, ID 83852 — just minutes from downtown Sandpoint. Hand-folded Northern Chinese dumplings and bao buns.",
    images: ["https://eastmeetswestfoods.co/assets/photos/sign.jpeg"],
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={{
          ...restaurantSchema,
          hasMap: "https://www.google.com/maps/search/?api=1&query=476534+US+HWY+95+Suite+B+Ponderay+ID+83852",
        }}
      />

      <main>
        <section className="section">
          <div className="container">
            <header className="section-head">
              <div className="text-panel text-panel--inline">
                <p className="eyebrow">Contact</p>
                <h1 className="section-title">Find us &amp; get in touch.</h1>
              </div>
            </header>

            <div className="visit-grid">
              <div className="text-panel">
                <p className="eyebrow">East Meets West Dumplings Bar</p>
                <p className="muted-text">Northern Chinese dumplings, bao buns, and sauce.</p>
                <div className="visit-row">
                  <strong>Address</strong>
                  <span>476534 US HWY 95, Suite B<br />Ponderay, ID 83852</span>
                </div>
                <div className="visit-row">
                  <strong>Phone</strong>
                  <span><a href="tel:+12086276283">(208) 627-6283</a></span>
                </div>
                <p className="muted-text">
                  We&apos;re in Ponderay, just a few minutes&apos; drive north of Sandpoint — easy to reach from anywhere in Bonner County.
                </p>
              </div>
              <div className="visit-map">
                <iframe
                  src="https://www.google.com/maps?q=476534+US+HWY+95+Ponderay+ID+83852&z=15&output=embed"
                  title="East Meets West Dumplings Bar location on Google Maps"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                <a
                  className="visit-map-overlay"
                  href="https://www.google.com/maps/search/?api=1&query=476534+US+HWY+95+Suite+B+Ponderay+ID+83852"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open East Meets West location in Google Maps"
                >
                  <span className="visit-map-cta">Open in Google Maps →</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
