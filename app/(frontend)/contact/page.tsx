import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import RestaurantJsonLd from "@/components/RestaurantJsonLd";
import { getBusinessInfo } from "@/lib/businessInfoServer";
import { addressOneLine, mapsSearchUrl } from "@/lib/businessInfo";
import { ContactView, type ContactDoc } from "@/components/contact/ContactView";
import { LiveContact } from "@/components/contact/LiveContact";

const title = "Find Us near Sandpoint — Ponderay, ID | East Meets West Dumplings Bar";

// The address in these descriptions follows the business info record, so a
// move doesn't leave search results showing the old one.
export async function generateMetadata(): Promise<Metadata> {
  const info = await getBusinessInfo();
  const where = addressOneLine(info.address);
  return {
    title,
    description: `${info.name} is at ${where} — just minutes from downtown Sandpoint. Get directions and visit us today.`,
    robots: { index: true, follow: true },
    alternates: { canonical: "https://eastmeetswestfoods.co/contact" },
    openGraph: {
      type: "website",
      siteName: "East Meets West Dumplings Bar",
      locale: "en_US",
      title,
      description: `${info.name} is at ${where} — just minutes from downtown Sandpoint. Authentic Northern Chinese dumplings and bao buns.`,
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
      description: `${where} — just minutes from downtown Sandpoint. Authentic Northern Chinese dumplings and bao buns.`,
      images: ["https://eastmeetswestfoods.co/assets/photos/sign.jpeg"],
    },
  };
}

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getContact(): Promise<ContactDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const contact = await payload.findGlobal({ slug: "contact", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return contact as unknown as ContactDoc;
}

export default async function ContactPage() {
  const [contact, business] = await Promise.all([getContact(), getBusinessInfo()]);
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <RestaurantJsonLd extra={{ hasMap: mapsSearchUrl(business.address) }} />
      {isDraftMode ? <LiveContact contact={contact} business={business} /> : <ContactView contact={contact} business={business} />}
    </>
  );
}
