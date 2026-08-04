import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { HomeView, type HomeDoc, type BannerDoc, type TestimonialDoc } from "@/components/home/HomeView";
import { LiveHome } from "@/components/home/LiveHome";

const title = "East Meets West Dumplings Bar — Dumplings near Sandpoint, ID";
const description =
  "Authentic hand-folded Northern Chinese dumplings and bao buns in Ponderay, Idaho — just minutes from downtown Sandpoint. Fast-food prices, made-from-scratch flavor.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/",
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
    description:
      "Authentic hand-folded Northern Chinese dumplings and bao buns in Ponderay, Idaho — minutes from Sandpoint. Fast-food prices, made-from-scratch flavor.",
    images: ["https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg"],
  },
};

// Statically rendered, so this is the only thing that makes a banner's
// `bannerEndDate` take effect without an editor re-saving the post —
// see the `bannerEndDate` field comment in collections/News.ts.
export const revalidate = 3600;

async function getHome(): Promise<HomeDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  // `overrideAccess: false` here would seem like the safe choice (mirroring
  // the "Local API bypasses access control" gotcha), but empirically it
  // breaks draft mode entirely: Payload's draft-lookup for Globals combines
  // `access.read`'s where clause into the *version* query too (not just the
  // published lookup), so `readPublished`'s `_status: "published"` filter
  // ends up ANDed against the draft version's `_status: "draft"` — a query
  // that can never match, so the draft is silently never found and the
  // published doc is returned even in preview mode. Collections avoid this
  // by using the Local API's default `overrideAccess: true` plus an
  // explicit `where` for the published case (see /menu's getMenuItems) —
  // Globals have no `where` param, but don't need one either: the base
  // "home" row is structurally always the last-*published* version (a
  // draft save never touches it — confirmed by testing), so
  // `overrideAccess: true` is safe for the `draft: false` path too, and
  // necessary for `draft: true` to actually surface the latest draft.
  const home = await payload.findGlobal({ slug: "home", draft: isDraftMode, overrideAccess: true, depth: 1 });
  return home as unknown as HomeDoc;
}

async function getHomepageAnnouncement(): Promise<BannerDoc | null> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "news-posts",
    draft: isDraftMode,
    where: {
      and: [
        { type: { equals: "announcement" } },
        { showAsHomepageBanner: { equals: true } },
        ...(isDraftMode ? [] : [{ _status: { equals: "published" as const } }]),
        {
          or: [{ bannerEndDate: { exists: false } }, { bannerEndDate: { greater_than: new Date().toISOString() } }],
        },
      ],
    },
    sort: "-updatedAt",
    limit: 1,
  });
  return (result.docs[0] as unknown as BannerDoc) ?? null;
}

async function shouldShowNewsTeaser(): Promise<boolean> {
  const payload = await getPayload({ config });
  const nav = (await payload.findGlobal({ slug: "navigation" })) as unknown as Record<string, unknown>;
  if (nav.newsTeaser === false) return false;

  const result = await payload.find({
    collection: "news-posts",
    where: { _status: { equals: "published" } },
    limit: 1,
  });
  return result.docs.length > 0;
}

async function getTestimonials(): Promise<TestimonialDoc[]> {
  const payload = await getPayload({ config });
  const nav = (await payload.findGlobal({ slug: "navigation" })) as unknown as Record<string, unknown>;
  if (nav.testimonialsSection === false) return [];

  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "testimonials",
    draft: isDraftMode,
    where: isDraftMode ? {} : { _status: { equals: "published" } },
    sort: "order",
    limit: 40,
  });
  return result.docs as unknown as TestimonialDoc[];
}

export default async function HomePage() {
  const [home, banner, showNewsTeaser, testimonials] = await Promise.all([
    getHome(),
    getHomepageAnnouncement(),
    shouldShowNewsTeaser(),
    getTestimonials(),
  ]);
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      <JsonLd data={restaurantSchema} />

      {isDraftMode ? (
        <LiveHome home={home} banner={banner} showNewsTeaser={showNewsTeaser} testimonials={testimonials} />
      ) : (
        <HomeView home={home} banner={banner} showNewsTeaser={showNewsTeaser} testimonials={testimonials} />
      )}
    </>
  );
}
