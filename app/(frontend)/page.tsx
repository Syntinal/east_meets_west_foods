import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { HomeView, type HomeDoc, type BannerDoc, type TestimonialDoc } from "@/components/home/HomeView";
import { LiveHome } from "@/components/home/LiveHome";
import type { LatestNewsPost } from "@/components/home/TeaserCards";
import { NAV_PAGES, resolveNavLabel } from "@/lib/navigation";
import { deriveExcerptFromMessage } from "@/lib/newsText";
import { resolveFeaturedImageUrl } from "@/lib/cloudinaryImage";

// NEXT_PUBLIC_ (not the plain server-only var) — see
// components/news/NewsPostView.tsx's own identical constant for why: this
// value isn't secret, and keeping one client-safe var covering both server
// and client render paths is simpler than threading a separately-computed
// URL through every context that might need it.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const title = "East Meets West Dumplings Bar — Dumplings near Sandpoint, ID";
const description =
  "Authentic Northern Chinese dumplings and bao buns in Ponderay, Idaho — just minutes from downtown Sandpoint. Fast-food prices, made-from-scratch flavor.";

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
      "Authentic Northern Chinese dumplings and bao buns in Ponderay, Idaho — minutes from Sandpoint. Fast-food prices, made-from-scratch flavor.",
    images: ["https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg"],
  },
};

// Statically rendered, so this is the only thing that makes a banner's
// `bannerEndDate` take effect without an editor re-saving the post —
// see the `bannerEndDate` field comment in collections/News.ts.
export const revalidate = 86400;

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
        // Available on every post now, not just an "Announcement" type
        // (that distinction was removed — see CLAUDE.md's News redesign).
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

// Feeds the "News" page card (see blocks/PageCardBlock.ts), which doesn't
// have its own image/body fields — it always shows the most recent News
// post's own photo and excerpt instead, so it stays current without the
// owner needing to separately update the teaser card every time they
// publish (see components/home/TeaserCards.tsx). `null` when there's
// nothing to show, which also hides the card entirely — this is the one
// remaining auto-hide behavior for News, now purely "is there a post,"
// not a separate on/off toggle (there used to be a "Show News teaser"
// checkbox on the Navigation page too — removed once card removal, just
// deleting the block, became the one way to hide it; see globals/Home.ts).
//
// Draft-mode-aware, matching getMenuItems() and every other fetch on this
// site — this used to hardcode `_status: "published"` unconditionally, so
// a draft-only News post never showed the teaser even while actively
// previewing the homepage in Draft Mode. Real visitors still only ever see
// it once a post is actually published.
async function getLatestNewsPost(isDraftMode: boolean): Promise<LatestNewsPost> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "news-posts",
    draft: isDraftMode,
    where: isDraftMode ? {} : { _status: { equals: "published" } },
    sort: "-publishedDate",
    limit: 1,
    depth: 1,
  });
  const post = result.docs[0] as
    | {
        featuredImage?: { url?: string | null; alt?: string | null; width?: number | null } | string | null;
        photoCaption?: { text?: string | null; captionStyle?: string | null; captionPosition?: string | null } | null;
        message?: string | null;
      }
    | undefined;
  if (!post) return null;
  const image = resolveFeaturedImageUrl({
    cloudName: CLOUD_NAME,
    image: post.featuredImage,
    captionText: post.photoCaption?.text,
    captionStyle: post.photoCaption?.captionStyle,
    captionPosition: post.photoCaption?.captionPosition,
  });
  return { image, excerpt: post.message ? deriveExcerptFromMessage(post.message) : null };
}

async function getTestimonials(nav: Record<string, unknown>): Promise<TestimonialDoc[]> {
  if (nav.testimonialsSection === false) return [];

  const payload = await getPayload({ config });
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

// Teaser card headings (Menu/Sauce/Story/News) are sourced from the
// Navigation global's per-page labels instead of a separate Home field —
// see globals/Home.ts's top comment for why.
function getTeaserNavLabels(nav: Record<string, unknown>): Record<"menu" | "sauce" | "story" | "news", string> {
  const labels = {} as Record<"menu" | "sauce" | "story" | "news", string>;
  for (const key of ["menu", "sauce", "story", "news"] as const) {
    const page = NAV_PAGES.find((p) => p.key === key)!;
    labels[key] = resolveNavLabel(page, nav).label;
  }
  return labels;
}

export default async function HomePage() {
  const { isEnabled: isDraftMode } = await draftMode();
  const payload = await getPayload({ config });
  const nav = (await payload.findGlobal({ slug: "navigation" })) as unknown as Record<string, unknown>;

  const [home, banner, latestNewsPost, testimonials] = await Promise.all([
    getHome(),
    getHomepageAnnouncement(),
    getLatestNewsPost(isDraftMode),
    getTestimonials(nav),
  ]);
  const navLabels = getTeaserNavLabels(nav);

  return (
    <>
      <JsonLd data={restaurantSchema} />

      {isDraftMode ? (
        <LiveHome
          home={home}
          banner={banner}
          latestNewsPost={latestNewsPost}
          testimonials={testimonials}
          navLabels={navLabels}
        />
      ) : (
        <HomeView
          home={home}
          banner={banner}
          latestNewsPost={latestNewsPost}
          testimonials={testimonials}
          navLabels={navLabels}
        />
      )}
    </>
  );
}
