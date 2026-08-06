import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { StoryView, type StoryDoc } from "@/components/story/StoryView";
import { LiveStory } from "@/components/story/LiveStory";

const title = "Our Story — Northern Chinese Recipes near Sandpoint, ID | East Meets West";
const description =
  "Ancient Northern Chinese recipes from Mongol and Haan ancestry, brought to Ponderay, Idaho — serving the Sandpoint area with authentic hand-folded dumplings and bao buns.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/story" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description:
      "Ancient Northern Chinese dumpling and bao recipes, passed down through generations of Mongol and Haan ancestry — now hand-folded daily in Ponderay, serving the Sandpoint area.",
    url: "https://eastmeetswestfoods.co/story",
    images: [
      {
        url: "https://eastmeetswestfoods.co/assets/photos/chef.jpeg",
        alt: "Chef Richard at East Meets West Dumplings Bar in Ponderay, Idaho",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Ancient Northern Chinese dumpling recipes, passed down through Mongol and Haan ancestry — now hand-folded daily in Ponderay, Idaho, serving the greater Sandpoint area.",
    images: ["https://eastmeetswestfoods.co/assets/photos/chef.jpeg"],
  },
};

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getStory(): Promise<StoryDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const story = await payload.findGlobal({ slug: "story", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return story as unknown as StoryDoc;
}

export default async function StoryPage() {
  const story = await getStory();
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <JsonLd data={restaurantSchema} />
      {isDraftMode ? <LiveStory story={story} /> : <StoryView story={story} />}
    </>
  );
}
