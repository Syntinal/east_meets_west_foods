import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "East Meets West Dumplings Bar — Dumplings near Sandpoint, ID";
const description =
  "Authentic hand-folded Northern Chinese dumplings and bao buns in Ponderay, Idaho — just minutes from downtown Sandpoint. Fast-food prices, made-from-scratch flavor.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/",
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
    description:
      "Authentic hand-folded Northern Chinese dumplings and bao buns in Ponderay, Idaho — minutes from Sandpoint. Fast-food prices, made-from-scratch flavor.",
    images: ["https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg"],
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={restaurantSchema} />

      <header id="home" className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo-link" aria-label="East Meets West Dumplings Bar home">
            <img src="/assets/photos/sign.png" alt="East Meets West 美味 Dumplings Bar" className="brand-sign" />
          </Link>
          <p className="brand-sub">Ponderay, Idaho &nbsp;&middot;&nbsp; Hand-folded daily</p>
        </div>
      </header>

      <div className="home-hero">
        <img
          src="/assets/photos/bao-tray.jpeg"
          alt="A tray of freshly steamed bao buns, golden and ready to serve"
          loading="eager"
        />
      </div>

      <section className="mission">
        <div className="container">
          <div className="text-panel text-panel--inline">
            <p className="eyebrow">Our Mission</p>
            <h1 className="mission-h1">East Meets West Dumplings Bar</h1>
            <p className="mission-statement">
              Singular focus on making the best dumplings, bao buns and sauce in
              the world — that Americans might enjoy them at fast food prices and
              service levels.
            </p>
            <p className="mission-location">
              Authentic Northern Chinese dumplings and bao buns in Ponderay, Idaho — just minutes from downtown Sandpoint.
            </p>
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true">* &nbsp; * &nbsp; *</div>

      <section className="teaser-section">
        <div className="container">
          <div className="teaser-grid">
            <Link href="/menu" className="teaser-card">
              <div className="teaser-card-img">
                <img src="/assets/photos/bao-steamer.jpeg" alt="Bao buns in a bamboo steamer" loading="lazy" />
              </div>
              <div className="teaser-card-body">
                <h3>Menu</h3>
                <p>Bao buns, dumplings, and combinations — all hand-folded daily.</p>
                <span className="teaser-card-cta">See the Menu →</span>
              </div>
            </Link>

            <Link href="/sauce" className="teaser-card">
              <div className="teaser-card-img">
                <img
                  src="/assets/photos/dumplings-tray.jpeg"
                  alt="Dumplings on a tray ready to be served with sauce"
                  loading="lazy"
                />
              </div>
              <div className="teaser-card-body">
                <h3>The Sauce</h3>
                <p>The secret is in the sauce — homemade garlic, made from scratch.</p>
                <span className="teaser-card-cta">Learn More →</span>
              </div>
            </Link>

            <Link href="/story" className="teaser-card">
              <div className="teaser-card-img">
                <img src="/assets/photos/chef.jpeg" alt="The chef at East Meets West" loading="lazy" />
              </div>
              <div className="teaser-card-body">
                <h3>Our Story</h3>
                <p>Ancient Northern Chinese recipes, brought to Ponderay, Idaho.</p>
                <span className="teaser-card-cta">Read Our Story →</span>
              </div>
            </Link>

            <Link href="/contact" className="teaser-card">
              <div className="teaser-card-img teaser-card-map">
                <iframe
                  src="https://www.google.com/maps?q=476534+US+HWY+95+Ponderay+ID+83852&z=14&output=embed"
                  title="Map showing East Meets West Dumplings Bar in Ponderay, Idaho"
                  loading="lazy"
                  aria-hidden="true"
                  tabIndex={-1}
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="teaser-card-body">
                <h3>Visit / Contact</h3>
                <p>476534 US HWY 95, Suite B — Ponderay, ID 83852.</p>
                <span className="teaser-card-cta">Get Directions →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="text-panel text-panel--inline">
            <p className="eyebrow">Chinese Food Near Sandpoint</p>
            <h2>Authentic Chinese Dumplings &amp; Bao Buns in the Sandpoint Area</h2>
            <p>
              Looking for authentic Chinese food near Sandpoint? East Meets West Dumplings Bar
              serves hand-folded Northern Chinese dumplings and bao buns from our spot in
              Ponderay, Idaho — just a couple of minutes north of downtown Sandpoint, right on
              US HWY 95. We&apos;re one of the only places in the Sandpoint and Bonner County area
              making authentic, made-from-scratch dumplings fresh every day.
            </p>
            <p>
              Whether you&apos;re craving dumplings in Sandpoint, fresh steamed bao buns, or a quick,
              affordable lunch in Ponderay, Kootenai, or Sagle, we&apos;re an easy stop. Take a look at
              our <Link href="/menu">full menu</Link>, discover{" "}
              <Link href="/sauce">our homemade garlic sauce</Link>, or{" "}
              <Link href="/contact">get directions</Link>. Call us at{" "}
              <a href="tel:+12086276283">(208)&nbsp;627-6283</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
