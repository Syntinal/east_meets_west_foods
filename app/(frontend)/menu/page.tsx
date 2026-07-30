import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

const title = "Menu — Chinese Dumplings & Bao near Sandpoint, ID | East Meets West";
const description =
  "Hand-folded Northern Chinese dumplings, bao buns, and combo platters from $7.99 — one of the Sandpoint area's only spots for authentic Chinese dumplings. Ponderay, ID. Flavors change weekly.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/menu" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description:
      "Hand-folded Northern Chinese dumplings and bao buns from $7.99 — one of the Sandpoint area's only spots for authentic Chinese dumplings. Ponderay, ID. Flavors change weekly.",
    url: "https://eastmeetswestfoods.co/menu",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg",
        alt: "A tray of hand-folded Northern Chinese dumplings ready to serve with garlic sauce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Hand-folded Northern Chinese dumplings and bao buns from $7.99, in Ponderay near Sandpoint, ID. Three offerings, made well. Flavors change weekly.",
    images: ["https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg"],
  },
};

// Static for now — becomes Payload/Neon-backed in a later step.
const menuSchema = {
  "@context": "https://schema.org",
  "@type": "Menu",
  name: "East Meets West Menu",
  url: "https://eastmeetswestfoods.co/menu",
  hasMenuSection: [
    {
      "@type": "MenuSection",
      name: "Bao Buns",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Bao Buns — 3 Buns",
          description:
            "Hand-folded bao buns with fresh local pork from Wood's Meats and alternating vegetables. Authentic Chinese fermented dough. Includes 1 garlic sauce.",
          offers: { "@type": "Offer", price: "7.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Bao Buns — 6 Buns",
          description:
            "Hand-folded bao buns with fresh local pork from Wood's Meats and alternating vegetables. Includes 1 garlic sauce.",
          offers: { "@type": "Offer", price: "13.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Bao Buns — 12 Buns",
          description:
            "Hand-folded bao buns with fresh local pork from Wood's Meats and alternating vegetables. Includes 2 garlic sauces.",
          offers: { "@type": "Offer", price: "24.99", priceCurrency: "USD" },
        },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Dumplings",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Dumplings — 3 Large Dumplings",
          description:
            "Authentic Northern Chinese dumplings, 30% larger than traditional Chinese dumplings, filled with fresh Wood's pork and alternating vegetables. Flavors change weekly. Includes 1 garlic sauce.",
          offers: { "@type": "Offer", price: "7.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Dumplings — 6 Large Dumplings",
          description:
            "Authentic Northern Chinese dumplings, 30% larger than traditional Chinese dumplings, filled with fresh Wood's pork and alternating vegetables. Flavors change weekly. Includes 1 garlic sauce.",
          offers: { "@type": "Offer", price: "13.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Pork & Vegetable Dumplings — 12 Large Dumplings",
          description:
            "Authentic Northern Chinese dumplings, 30% larger than traditional Chinese dumplings, filled with fresh Wood's pork and alternating vegetables. Flavors change weekly. Includes 2 garlic sauces.",
          offers: { "@type": "Offer", price: "24.99", priceCurrency: "USD" },
        },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Combination Platters",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Combination — 3 Dumplings + 3 Bao Buns",
          description:
            "Experience both hand-folded Northern Chinese dumplings and bao buns in one platter. Includes 1 garlic sauce.",
          offers: { "@type": "Offer", price: "13.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Combination — 6 Dumplings + 6 Bao Buns",
          description:
            "Experience both hand-folded Northern Chinese dumplings and bao buns in one platter. Includes 2 garlic sauces.",
          offers: { "@type": "Offer", price: "24.99", priceCurrency: "USD" },
        },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Sides & Extras",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Side of Fried Rice (or other side)",
          description: "Add to any meal for $3, or $3.99 purchased alone.",
          offers: { "@type": "Offer", price: "3.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Extra Garlic Sauce",
          description: "An extra serving of our homemade garlic sauce.",
          offers: { "@type": "Offer", price: "1.50", priceCurrency: "USD" },
        },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Drinks",
      hasMenuItem: [
        { "@type": "MenuItem", name: "Water", offers: { "@type": "Offer", price: "0.99", priceCurrency: "USD" } },
        {
          "@type": "MenuItem",
          name: "Soft Drinks",
          offers: { "@type": "Offer", price: "1.99", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Chinese Imported Drinks",
          offers: { "@type": "Offer", price: "4.99", priceCurrency: "USD" },
        },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Imported Asian Snacks",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Asian Lay's & Pringles",
          offers: { "@type": "Offer", price: "6.00", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Large Bagged Snacks",
          offers: { "@type": "Offer", price: "5.00", priceCurrency: "USD" },
        },
        {
          "@type": "MenuItem",
          name: "Small Bagged Snacks",
          offers: { "@type": "Offer", price: "3.00", priceCurrency: "USD" },
        },
      ],
    },
  ],
};

export default function MenuPage() {
  return (
    <>
      <JsonLd data={{ ...restaurantSchema, hasMenu: "https://eastmeetswestfoods.co/menu" }} />
      <JsonLd data={menuSchema} />

      <main>
        <section className="section menu-main">
          <div className="container">
            <header className="section-head">
              <div className="text-panel text-panel--inline">
                <p className="eyebrow">Menu</p>
                <h1 className="section-title">East Meets West Menu</h1>
                <p className="section-lede">
                  Three offerings, made well — dumpling flavors change weekly. One of
                  the Sandpoint area&apos;s only spots for authentic hand-folded Northern
                  Chinese dumplings, in Ponderay.
                </p>
              </div>
            </header>

            <div className="menu-grid">
              <article className="menu-card">
                <div className="menu-card-img">
                  <img
                    src="/assets/photos/bao-steamer.jpeg"
                    alt="Hand-folded pork and vegetable bao buns resting in a bamboo steamer"
                  />
                </div>
                <div className="menu-card-body">
                  <p className="card-tag">Northern Chinese</p>
                  <h2>Pork &amp; Vegetable Bao Buns</h2>
                  <p>
                    Authentic, ancient, Chinese filled buns with fresh, local pork
                    from Wood&apos;s Meats and alternating vegetables such as leeks and
                    cabbage. Authentic Chinese fermented dough adds chewiness and a
                    wonderful bite.
                  </p>
                  <ul className="price-list">
                    <li><span>3 Buns</span><strong>$7.99</strong><em>1 sauce</em></li>
                    <li><span>6 Buns</span><strong>$13.99</strong><em>1 sauce</em></li>
                    <li><span>12 Buns</span><strong>$24.99</strong><em>2 sauces</em></li>
                  </ul>
                </div>
              </article>

              <article className="menu-card">
                <div className="menu-card-img">
                  <img
                    src="/assets/photos/dumplings-steamer.jpeg"
                    alt="Hand-folded Northern Chinese pork dumplings arranged in a bamboo steamer"
                  />
                </div>
                <div className="menu-card-body">
                  <p className="card-tag">Northern Chinese</p>
                  <h2>Pork &amp; Vegetable Dumplings</h2>
                  <p>
                    Ancient, authentic Chinese dumplings — 30% larger than
                    traditional Chinese dumplings — filled with fresh Wood&apos;s pork
                    and alternating vegetables such as leeks and cabbage.
                  </p>
                  <ul className="price-list">
                    <li><span>3 Large Dumplings</span><strong>$7.99</strong><em>1 sauce</em></li>
                    <li><span>6 Large Dumplings</span><strong>$13.99</strong><em>1 sauce</em></li>
                    <li><span>12 Large Dumplings</span><strong>$24.99</strong><em>2 sauces</em></li>
                  </ul>
                </div>
              </article>

              <article className="menu-card">
                <div className="menu-card-img">
                  <img
                    src="/assets/photos/dumplings-tray.jpeg"
                    alt="A combination platter of hand-folded dumplings and bao buns on a serving tray"
                  />
                </div>
                <div className="menu-card-body">
                  <p className="card-tag">Best of Both</p>
                  <h2>Combination: Buns &amp; Dumplings</h2>
                  <p>
                    Designed to allow guests to experience the combined taste of
                    dumplings and buns.
                  </p>
                  <ul className="price-list">
                    <li><span>3 Dumplings + 3 Buns</span><strong>$13.99</strong><em>1 sauce</em></li>
                    <li><span>6 Dumplings + 6 Buns</span><strong>$24.99</strong><em>2 sauces</em></li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section menu-extras">
          <div className="container">
            <div className="extras-grid">
              <div className="extras-card">
                <h3>Meal Deal &amp; Extras</h3>
                <ul className="extras-list">
                  <li><span>Side of fried rice (or other side) with any meal</span><strong>+$3</strong></li>
                  <li><span>Side purchased alone</span><strong>$3.99</strong></li>
                  <li><span>Extra garlic sauce</span><strong>$1.50</strong></li>
                </ul>
              </div>

              <div className="extras-card">
                <h3>Drinks</h3>
                <ul className="extras-list">
                  <li><span>Water</span><strong>$0.99</strong></li>
                  <li><span>Soft Drinks</span><strong>$1.99</strong></li>
                  <li><span>Chinese Imported Drinks</span><strong>$4.99</strong></li>
                </ul>
              </div>

              <div className="extras-card">
                <h3>Imported Asian Snacks</h3>
                <ul className="extras-list">
                  <li><span>Asian Lay&apos;s &amp; Pringles</span><strong>$6</strong></li>
                  <li><span>Large Bagged Snacks</span><strong>$5</strong></li>
                  <li><span>Small Bagged Snacks</span><strong>$3</strong></li>
                </ul>
              </div>
            </div>

            <p className="menu-note text-panel">
              Dumpling flavors change weekly. In the coming months we plan on
              offering an &quot;Americana&quot; line of dumplings under the moniker — yes, as
              Americans, we change everything. Some initial ideas include Memphis
              Sweet BBQ as well as other flavors.
            </p>
            <p className="menu-note muted text-panel">
              There are gluten and soy-based products (soy sauce, oil, etc.) in
              this food, as this is part of maintaining authenticity.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
