import Link from "next/link";
import { deriveExcerptFromMessage } from "@/lib/newsText";

export type NewsListDoc = {
  id: string;
  title: string;
  slug: string;
  message: string;
  featuredImage?: { url?: string | null; alt?: string | null } | string | null;
  publishedDate?: string | null;
};

// The box above the post grid on /news — backed by globals/NewsIntro.ts.
export type NewsIntroDoc = {
  eyebrow?: string | null;
  heading?: string | null;
  lede?: string | null;
  emptyStateMessage?: string | null;
  readMoreText?: string | null;
};

// Shared between the plain server-rendered /news page and its live-preview
// counterpart (for the intro box only — see components/news/LiveNewsIntro.tsx)
// — same markup either way, just fed different data. Mirrors
// components/menu/MenuGridView.tsx's split between editable chrome and a
// plain server-fetched list.
export function NewsListView({ posts, intro }: { posts: NewsListDoc[]; intro: NewsIntroDoc }) {
  return (
    <main>
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div className="text-panel text-panel--inline">
              <p className="eyebrow">{intro.eyebrow}</p>
              <h1 className="section-title">{intro.heading}</h1>
              <p className="section-lede">{intro.lede}</p>
            </div>
          </header>

          {posts.length === 0 ? (
            <p className="muted-text">{intro.emptyStateMessage}</p>
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
                      <h2>
                        <Link href={`/news/${post.slug}`}>{post.title}</Link>
                      </h2>
                      {post.message && (
                        <p className="news-card-excerpt">{deriveExcerptFromMessage(post.message)}</p>
                      )}
                      <Link href={`/news/${post.slug}`} className="teaser-card-cta">
                        {intro.readMoreText}
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
