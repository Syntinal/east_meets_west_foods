import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { richTextToPlainText } from "@/lib/richTextToPlainText";
import { FaqView, type FaqDoc } from "@/components/faq/FaqView";
import { LiveFaq } from "@/components/faq/LiveFaq";

const title = "FAQ — East Meets West Dumplings Bar near Sandpoint, ID";
const description =
  "Common questions about East Meets West Dumplings Bar in Ponderay, ID — near Sandpoint. Hand-folded Northern Chinese dumplings, bao buns, allergens, location, and menu pricing answered.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/faq" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/faq",
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
    description,
    images: ["https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg"],
  },
};

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getFaq(): Promise<FaqDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const faq = await payload.findGlobal({ slug: "faq", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return faq as unknown as FaqDoc;
}

// Built from the same `questions` field that renders the visible <dl> —
// previously this page had two independently hand-typed copies of the same
// 6 answers (one for display, one hardcoded in a FAQPage JSON-LD object
// right here) that could drift apart. See globals/Faq.ts.
function buildFaqSchema(faq: FaqDoc) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faq.questions ?? [])
      .filter((q) => q.question)
      .map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: richTextToPlainText(q.answer),
        },
      })),
  };
}

export default async function FaqPage() {
  const faq = await getFaq();
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <JsonLd data={restaurantSchema} />
      <JsonLd data={buildFaqSchema(faq)} />
      {isDraftMode ? <LiveFaq faq={faq} /> : <FaqView faq={faq} />}
    </>
  );
}
