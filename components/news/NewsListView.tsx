import Link from "next/link";
import { deriveExcerptFromMessage } from "@/lib/newsText";
import { resolveFeaturedImageUrl } from "@/lib/cloudinaryImage";
import { buildCaptionFramePreviewUrl, type CaptionFont, type CaptionPosition, type CaptionStyle } from "@/lib/cloudinaryVideo";

export type NewsListDoc = {
  id: string;
  title: string;
  slug: string;
  message: string;
  featuredImage?: { url?: string | null; alt?: string | null; width?: number | null } | string | null;
  photoCaption?: { text?: string | null; captionStyle?: string | null; captionPosition?: string | null } | null;
  // Only `publicId`/the card-1 caption fields are read here — see the
  // fallback thumbnail below. The rest of the Video Studio's fields
  // (music, additional cards, closing card, ...) don't matter for a still
  // frame and aren't typed here.
  cloudinaryVideo?: {
    publicId?: string | null;
    overlayText?: string | null;
    captionStyle?: string | null;
    captionPosition?: string | null;
    captionFont?: string | null;
  } | null;
  publishedDate?: string | null;
};

// NEXT_PUBLIC_ since this renders in a plain server component — see
// components/news/NewsPostView.tsx's own identical constant for why.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

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
                let image = resolveFeaturedImageUrl({
                  cloudName: CLOUD_NAME,
                  image: post.featuredImage,
                  captionText: post.photoCaption?.text,
                  captionStyle: post.photoCaption?.captionStyle,
                  captionPosition: post.photoCaption?.captionPosition,
                });
                // No featuredImage, but there's a Video Studio video —
                // pull a still frame (with that video's own card-1 caption
                // baked in, for visual consistency with the real video)
                // instead of leaving the card with no thumbnail at all.
                if (!image && CLOUD_NAME && post.cloudinaryVideo?.publicId) {
                  image = {
                    url: buildCaptionFramePreviewUrl({
                      cloudName: CLOUD_NAME,
                      publicId: post.cloudinaryVideo.publicId,
                      overlayText: post.cloudinaryVideo.overlayText,
                      captionStyle: (post.cloudinaryVideo.captionStyle as CaptionStyle) || undefined,
                      captionPosition: (post.cloudinaryVideo.captionPosition as CaptionPosition) || undefined,
                      captionFont: (post.cloudinaryVideo.captionFont as CaptionFont) || undefined,
                    }),
                    alt: null,
                  };
                }
                // Both the heading and this excerpt are derived from the
                // same `message` (see lib/newsText.ts) — for a short,
                // single-line post (the common case this collection is
                // designed around, see collections/News.ts's own
                // reasoning), neither derivation needs to truncate, so
                // they come back byte-identical. Showing the exact same
                // sentence twice — once as the heading, once directly
                // below it as a "teaser" — reads as a mistake, not a
                // feature, so skip the excerpt entirely when it wouldn't
                // add anything beyond the heading it sits under. A longer
                // or multi-line post still gets both, since the excerpt
                // then genuinely carries more than the heading did.
                const excerpt = post.message ? deriveExcerptFromMessage(post.message) : null;
                const excerptAddsSomething = excerpt && excerpt !== post.title;
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
                      {excerptAddsSomething && <p className="news-card-excerpt">{excerpt}</p>}
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
