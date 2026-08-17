import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { SauceView, type SauceDoc } from "@/components/sauce/SauceView";
import { LiveSauce } from "@/components/sauce/LiveSauce";

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
      "Made from scratch and deeply flavored, our homemade garlic sauce complements authentic Northern Chinese dumplings and bao buns. A Sandpoint–Ponderay original.",
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
      "Made from scratch — our robust homemade garlic sauce is the perfect companion to authentic Northern Chinese dumplings and bao buns in Ponderay near Sandpoint.",
    images: ["https://eastmeetswestfoods.co/assets/photos/dumplings-tray.jpeg"],
  },
};

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getSauce(): Promise<SauceDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const sauce = await payload.findGlobal({ slug: "sauce", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return sauce as unknown as SauceDoc;
}

export default async function SaucePage() {
  const sauce = await getSauce();
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <JsonLd data={restaurantSchema} />
      {isDraftMode ? <LiveSauce sauce={sauce} /> : <SauceView sauce={sauce} />}
    </>
  );
}
