import type { Metadata } from "next";
import { cookies, draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { MenuGridView, type MenuItemDoc, type MenuIntroDoc } from "@/components/menu/MenuGridView";
import { LiveMenuGrid } from "@/components/menu/LiveMenuGrid";
import { LiveMenuIntro } from "@/components/menu/LiveMenuIntro";

const title = "Menu — Chinese Dumplings & Bao near Sandpoint, ID | East Meets West";
const description =
  "Northern Chinese dumplings, bao buns, and combo platters from $7.99 — one of the Sandpoint area's only spots for authentic Chinese dumplings. Ponderay, ID. Flavors change weekly.";

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
      "Northern Chinese dumplings and bao buns from $7.99 — one of the Sandpoint area's only spots for authentic Chinese dumplings. Ponderay, ID. Flavors change weekly.",
    url: "https://eastmeetswestfoods.co/menu",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg",
        alt: "A tray of Northern Chinese dumplings ready to serve with garlic sauce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Northern Chinese dumplings and bao buns from $7.99, in Ponderay near Sandpoint, ID. Three offerings, made well. Flavors change weekly.",
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

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getMenuIntro(): Promise<MenuIntroDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const intro = await payload.findGlobal({
    slug: "menu-intro",
    draft: isDraftMode,
    overrideAccess: true,
    depth: 0,
  });
  return intro as unknown as MenuIntroDoc;
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
  const [items, intro] = await Promise.all([getMenuItems(), getMenuIntro()]);
  const menuSchema = buildMenuSchema(items);
  const { isEnabled: isDraftMode } = await draftMode();
  // Set as a cookie by /next/preview rather than read from a query string —
  // Vercel strips searchParams during ISR bypass even in Draft Mode, but
  // cookies survive (see lib/preview.ts). Absent when previewing the Menu
  // Intro global instead of a specific Menu Item — /next/preview explicitly
  // clears this cookie in that case rather than leaving a stale id behind.
  const livePreviewId = isDraftMode ? (await cookies()).get("live-preview-id")?.value : undefined;
  // Postgres ids come back as numbers, but the cookie value is always a
  // string — compare as strings on both sides rather than relying on ===.
  const seedItem = livePreviewId ? items.find((item) => String(item.id) === livePreviewId) : undefined;

  // Exactly one useLivePreview subscription per session: editing a Menu
  // Item live-updates the grid (intro shown as last-saved draft); editing
  // the Menu Intro global live-updates the box above the grid (items shown
  // as last-saved draft). See components/menu/LiveMenuIntro.tsx for why
  // these can't both be mounted at once.
  let body;
  if (isDraftMode && seedItem) {
    body = <LiveMenuGrid initialItems={items} seedItem={seedItem} intro={intro} />;
  } else if (isDraftMode) {
    body = <LiveMenuIntro items={items} intro={intro} />;
  } else {
    body = <MenuGridView items={items} intro={intro} />;
  }

  return (
    <>
      <JsonLd data={{ ...restaurantSchema, hasMenu: "https://eastmeetswestfoods.co/menu" }} />
      <JsonLd data={menuSchema} />

      <main>{body}</main>
    </>
  );
}
