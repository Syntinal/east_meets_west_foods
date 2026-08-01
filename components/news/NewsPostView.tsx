import Link from "next/link";
import { RichText } from "@payloadcms/richtext-lexical/react";

export type NewsDoc = {
  id: string;
  title: string;
  slug: string;
  type: "post" | "announcement";
  excerpt?: string | null;
  featuredImage?: { url?: string | null; alt?: string | null } | string | null;
  publishedDate?: string | null;
  // Lexical's serialized editor state — rendered via Payload's <RichText>.
  body: unknown;
};

// Shared between the plain server-rendered /news/[slug] page and its
// live-preview counterpart — same markup either way, just fed different data.
export function NewsPostView({ post }: { post: NewsDoc }) {
  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;

  return (
    <>
      <Link href="/news" className="news-back-link">
        ← Back to News
      </Link>

      <header className="section-head">
        <div className="text-panel text-panel--inline">
          {post.type === "announcement" && <p className="card-tag">Announcement</p>}
          <h1 className="section-title">{post.title}</h1>
        </div>
      </header>

      {image?.url && (
        <div className="menu-card-img" style={{ marginBottom: 24, borderRadius: 4, overflow: "hidden" }}>
          <img src={image.url} alt={image.alt ?? post.title} />
        </div>
      )}

      <div className="text-panel news-body">
        <RichText data={post.body as never} />
      </div>
    </>
  );
}
