import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";

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

type NewsDoc = {
  id: string;
  title: string;
  slug: string;
  type: "post" | "announcement";
  excerpt?: string | null;
  featuredImage?: { url?: string | null; alt?: string | null } | string | null;
  publishedDate?: string | null;
};

export async function getNewsPosts(): Promise<NewsDoc[]> {
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
  return result.docs as unknown as NewsDoc[];
}

export default async function NewsPage() {
  const posts = await getNewsPosts();

  return (
    <main>
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div className="text-panel text-panel--inline">
              <p className="eyebrow">News</p>
              <h1 className="section-title">Announcements &amp; Updates</h1>
              <p className="section-lede">
                What&apos;s new at East Meets West — announcements, seasonal flavors, and updates from Ponderay.
              </p>
            </div>
          </header>

          {posts.length === 0 ? (
            <p className="muted-text">Nothing posted yet — check back soon.</p>
          ) : (
            <div className="menu-grid">
              {posts.map((post) => {
                const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;
                return (
                  <article className="menu-card" key={post.id}>
                    {image?.url && (
                      <div className="menu-card-img">
                        <img src={image.url} alt={image.alt ?? post.title} />
                      </div>
                    )}
                    <div className="menu-card-body">
                      {post.type === "announcement" && <p className="card-tag">Announcement</p>}
                      <h2>
                        <Link href={`/news/${post.slug}`}>{post.title}</Link>
                      </h2>
                      {post.excerpt && <p>{post.excerpt}</p>}
                      <Link href={`/news/${post.slug}`} className="teaser-card-cta">
                        Read more →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
