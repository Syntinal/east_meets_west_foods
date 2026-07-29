import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";

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

export default function StoryPage() {
  return (
    <>
      <JsonLd data={restaurantSchema} />

      <main>
        <section className="section">
          <div className="container story-grid">
            <div className="story-photo">
              <img
                src="/assets/photos/chef.jpeg"
                alt="Chef Richard at East Meets West Dumplings Bar, Ponderay Idaho — the chef behind the authentic Northern Chinese recipes"
              />
            </div>
            <div className="story-text text-panel">
              <p className="eyebrow">Our Story</p>
              <h1 className="section-title">About East Meets West LLC.</h1>
              <p>
                Several years ago, at potluck social dinners, I began to notice
                that food lines would invariably merge to my wife&apos;s Chinese
                dumplings line, and thought Americans might enjoy this delicious
                food if we could commercialize these ancient recipes. After nearly
                two years of substantial research and development — with many
                failures — we believe that we have created an authentic product
                that many Americans will enjoy.
              </p>
              <p>
                All of the recipes are authentic and likely passed down through
                many generations of my wife&apos;s Mongol and Haan ancestry near the
                Mongolian and Russian border in Northern China. Today they&apos;re hand-folded
                daily in Ponderay, Idaho — making East Meets West one of the Sandpoint
                area&apos;s only destinations for genuine Northern Chinese dumplings and bao buns.
              </p>
              <p>
                Along with our authentic line of dumplings, in future months we
                plan on introducing an Americana line of dumplings under the
                mantra: <em>&quot;Of course Americans change everything, even food.&quot;</em>{" "}
                Some initial ideas are Memphis Sweet BBQ dumplings as well as other
                innovations.
              </p>
              <p>
                We hope that you enjoy these traditional Chinese recipes as much as
                we do.
              </p>

              <blockquote className="pull-quote">
                <p>&quot;Nothing is more important than the food.&quot;</p>
                <cite>— Richard, Chef</cite>
              </blockquote>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
