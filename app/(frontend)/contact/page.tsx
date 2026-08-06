import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { ContactView, type ContactDoc } from "@/components/contact/ContactView";
import { LiveContact } from "@/components/contact/LiveContact";

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

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getContact(): Promise<ContactDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const contact = await payload.findGlobal({ slug: "contact", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return contact as unknown as ContactDoc;
}

export default async function ContactPage() {
  const contact = await getContact();
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <JsonLd
        data={{
          ...restaurantSchema,
          hasMap: "https://www.google.com/maps/search/?api=1&query=476534+US+HWY+95+Suite+B+Ponderay+ID+83852",
        }}
      />
      {isDraftMode ? <LiveContact contact={contact} /> : <ContactView contact={contact} />}
    </>
  );
}
