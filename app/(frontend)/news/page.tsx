import type { Metadata } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import { NewsListView, type NewsListDoc, type NewsIntroDoc } from "@/components/news/NewsListView";
import { LiveNewsIntro } from "@/components/news/LiveNewsIntro";

const title = "News — East Meets West Dumplings Bar";
const description = "Announcements and updates from East Meets West Dumplings Bar in Ponderay, Idaho.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://eastmeetswestfoods.co/news" },
  openGraph: {
    type: "website",
    siteName: "East Meets West Dumplings Bar",
    locale: "en_US",
    title,
    description,
    url: "https://eastmeetswestfoods.co/news",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export async function getNewsPosts(): Promise<NewsListDoc[]> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "news-posts",
    sort: "-publishedDate",
    limit: 50,
    depth: 1,
    draft: isDraftMode,
    // Local API bypasses access control by default, so `draft` alone won't
    // hide never-published drafts — filter explicitly.
    where: isDraftMode ? {} : { _status: { equals: "published" } },
  });
  return result.docs as unknown as NewsListDoc[];
}

// See getHome() in app/(frontend)/page.tsx for why overrideAccess must be
// true (not false) for a Global's draft lookup to actually work.
async function getNewsIntro(): Promise<NewsIntroDoc> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const intro = await payload.findGlobal({
    slug: "news-intro",
    draft: isDraftMode,
    overrideAccess: true,
    depth: 0,
  });
  return intro as unknown as NewsIntroDoc;
}

// The footer's Facebook link (Navigation global) doubles as the source for
// the "Latest on Facebook" feed box, so there's only one place to change it.
async function getFacebookUrl(): Promise<string | null> {
  const payload = await getPayload({ config });
  const nav = (await payload.findGlobal({ slug: "navigation", depth: 0 })) as unknown as {
    socialLinks?: { facebook?: string | null } | null;
  };
  return nav.socialLinks?.facebook || null;
}

export default async function NewsPage() {
  const [posts, intro, facebookUrl] = await Promise.all([getNewsPosts(), getNewsIntro(), getFacebookUrl()]);
  const { isEnabled: isDraftMode } = await draftMode();

  return isDraftMode ? (
    <LiveNewsIntro posts={posts} intro={intro} facebookUrl={facebookUrl} />
  ) : (
    <NewsListView posts={posts} intro={intro} facebookUrl={facebookUrl} />
  );
}
