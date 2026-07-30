import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
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

// Statically rendered — the MenuItems collection's afterChange/afterDelete
// hooks call revalidatePath("/menu") to bust this on save, so real visitors
// get a cached response instead of a fresh DB query on every request.

type PriceOption = { label: string; price: string; note?: string | null };
type MenuItemDoc = {
  id: string;
  title: string;
  tag?: string | null;
  group: "main" | "extras";
  description?: string | null;
  image?: { url?: string | null; alt?: string | null } | string | null;
  priceOptions: PriceOption[];
  order?: number | null;
};

async function getMenuItems(): Promise<MenuItemDoc[]> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "menu-items",
    sort: "order",
    limit: 100,
    depth: 1,
    draft: isDraftMode,
    // Local API bypasses access control by default, so `draft` alone won't
    // hide never-published drafts — filter explicitly.
    where: isDraftMode ? {} : { _status: { equals: "published" } },
  });
  return result.docs as unknown as MenuItemDoc[];
}

function toOfferPrice(price: string): string {
  const match = price.match(/[\d.]+/);
  return match ? match[0] : price;
}

function buildMenuSchema(items: MenuItemDoc[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "East Meets West Menu",
    url: "https://eastmeetswestfoods.co/menu",
    hasMenuSection: items.map((item) => ({
      "@type": "MenuSection",
      name: item.title,
      hasMenuItem: item.priceOptions.map((option) => {
        const description = [item.description, option.note ? `Includes ${option.note}.` : null]
          .filter(Boolean)
          .join(" ");
        return {
          "@type": "MenuItem",
          name: `${item.title} — ${option.label}`,
          ...(description ? { description } : {}),
          offers: { "@type": "Offer", price: toOfferPrice(option.price), priceCurrency: "USD" },
        };
      }),
    })),
  };
}

export default async function MenuPage() {
  const items = await getMenuItems();
  const mainItems = items.filter((item) => item.group === "main");
  const extraItems = items.filter((item) => item.group === "extras");
  const menuSchema = buildMenuSchema(items);

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
              {mainItems.map((item) => {
                const image = item.image && typeof item.image === "object" ? item.image : null;
                return (
                  <article className="menu-card" key={item.id}>
                    {image?.url && (
                      <div className="menu-card-img">
                        <img src={image.url} alt={image.alt ?? item.title} />
                      </div>
                    )}
                    <div className="menu-card-body">
                      {item.tag && <p className="card-tag">{item.tag}</p>}
                      <h2>{item.title}</h2>
                      {item.description && <p>{item.description}</p>}
                      <ul className="price-list">
                        {item.priceOptions.map((option, i) => (
                          <li key={i}>
                            <span>{option.label}</span>
                            <strong>{option.price}</strong>
                            {option.note && <em>{option.note}</em>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section menu-extras">
          <div className="container">
            <div className="extras-grid">
              {extraItems.map((item) => (
                <div className="extras-card" key={item.id}>
                  <h3>{item.title}</h3>
                  <ul className="extras-list">
                    {item.priceOptions.map((option, i) => (
                      <li key={i}>
                        <span>{option.label}</span>
                        <strong>{option.price}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
