import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { MenuGridView, type MenuItemDoc } from "@/components/menu/MenuGridView";
import { LiveMenuGrid } from "@/components/menu/LiveMenuGrid";

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

type PageProps = { searchParams: Promise<{ livePreviewId?: string }> };

export default async function MenuPage({ searchParams }: PageProps) {
  const items = await getMenuItems();
  const menuSchema = buildMenuSchema(items);
  const { isEnabled: isDraftMode } = await draftMode();
  const livePreviewId = isDraftMode ? (await searchParams).livePreviewId : undefined;
  // Postgres ids come back as numbers, but URL query params are always
  // strings — compare as strings on both sides rather than relying on ===.
  const seedItem = livePreviewId ? items.find((item) => String(item.id) === livePreviewId) : undefined;

  return (
    <>
      <JsonLd data={{ ...restaurantSchema, hasMenu: "https://eastmeetswestfoods.co/menu" }} />
      <JsonLd data={menuSchema} />

      <main
        data-debug-live-preview={JSON.stringify({
          isDraftMode,
          livePreviewId: livePreviewId ?? null,
          seedItemFound: Boolean(seedItem),
        })}
      >
        {isDraftMode && seedItem ? (
          <LiveMenuGrid initialItems={items} seedItem={seedItem} />
        ) : (
          <MenuGridView items={items} />
        )}
      </main>
    </>
  );
}
