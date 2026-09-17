import Link from "next/link";
import { NAV_PAGES } from "@/lib/navigation";
import type { TeaserNavLabels } from "./HomeView";

type MediaRef = { url?: string | null; alt?: string | null } | string | null;

export type TeaserBlock =
  | {
      blockType: "pageCard";
      id?: string;
      page: "menu" | "sauce" | "story" | "news";
      image?: MediaRef;
      body?: string | null;
      // Only meaningful when page === "news" — see blocks/PageCardBlock.ts.
      newsFallbackImage?: MediaRef;
      ctaText?: string | null;
    }
  | { blockType: "mapCard"; id?: string; heading?: string | null; body?: string | null; ctaText?: string | null }
  | { blockType: "customCard"; id?: string; image?: MediaRef; heading: string; body?: string | null; ctaText?: string | null; href: string };

// The News page card doesn't use its own `image`/`body` fields (hidden in
// admin — see blocks/PageCardBlock.ts) — it always shows the most recent
// News post's own photo and excerpt instead, so it stays current without
// the owner needing to separately update the teaser card every time they
// publish. `null` when there's no post to show (the card itself is hidden
// in that case — see below).
export type LatestNewsPost = { image?: MediaRef; excerpt?: string | null } | null;

function resolveMedia(ref: MediaRef): { url: string; alt: string | null } | null {
  if (!ref || typeof ref !== "object" || !ref.url) return null;
  return { url: ref.url, alt: ref.alt ?? null };
}

// Renders the homepage's `teaserCards` Blocks field in order. Shared
// between the plain server-rendered `/` page and its Live Preview
// counterpart, same as components/pages/BlockRenderer.tsx renders Pages'
// `layout` blocks — this is the same "typed, reorderable list" pattern,
// just homepage-specific (see globals/Home.ts's top comment for why these
// 3 block types live outside the shared Pages block picker).
export function TeaserCards({
  blocks,
  navLabels,
  latestNewsPost,
}: {
  blocks: TeaserBlock[];
  navLabels: TeaserNavLabels;
  // A "News" page card only makes sense while there's a News post for it to
  // point visitors at and pull its photo/excerpt from — this is the one
  // remaining auto-hide behavior, now purely "is there anything to show"
  // rather than a separate on/off toggle (see
  // app/(frontend)/page.tsx's getLatestNewsPost()).
  latestNewsPost: LatestNewsPost;
}) {
  return (
    <section className="teaser-section">
      <div className="container">
        <div className="teaser-grid">
          {blocks.map((block, i) => {
            const key = block.id ?? i;

            if (block.blockType === "pageCard") {
              const page = NAV_PAGES.find((p) => p.key === block.page);
              if (!page) return null;
              const label = navLabels[block.page];

              if (block.page === "news") {
                if (!latestNewsPost) return null;
                // Falls back to the block's own newsFallbackImage when the
                // post itself has no featured photo — otherwise the card's
                // photo area (a reserved 4:3 box) would render empty.
                const image =
                  resolveMedia(latestNewsPost.image ?? null) ?? resolveMedia(block.newsFallbackImage ?? null);
                return (
                  <Link key={key} href={page.href} className="teaser-card">
                    <div className="teaser-card-img">
                      {image?.url && <img src={image.url} alt={image.alt ?? label} loading="lazy" />}
                    </div>
                    <div className="teaser-card-body">
                      <h3>{label}</h3>
                      {latestNewsPost.excerpt && <p>{latestNewsPost.excerpt}</p>}
                      <span className="teaser-card-cta">{block.ctaText || "Learn More →"}</span>
                    </div>
                  </Link>
                );
              }

              const image = resolveMedia(block.image ?? null);
              return (
                <Link key={key} href={page.href} className="teaser-card">
                  <div className="teaser-card-img">
                    {image?.url && <img src={image.url} alt={image.alt ?? label} loading="lazy" />}
                  </div>
                  <div className="teaser-card-body">
                    <h3>{label}</h3>
                    {block.body && <p>{block.body}</p>}
                    <span className="teaser-card-cta">{block.ctaText || "Learn More →"}</span>
                  </div>
                </Link>
              );
            }

            if (block.blockType === "mapCard") {
              return (
                <Link key={key} href="/contact" className="teaser-card">
                  <div className="teaser-card-img teaser-card-map">
                    <iframe
                      src="https://www.google.com/maps?q=476534+US+HWY+95+Ponderay+ID+83852&z=14&output=embed"
                      title="Map showing East Meets West Dumplings Bar in Ponderay, Idaho"
                      loading="lazy"
                      aria-hidden="true"
                      tabIndex={-1}
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                  <div className="teaser-card-body">
                    <h3>{block.heading || "Visit / Contact"}</h3>
                    <p>{block.body || "476534 US HWY 95, Suite B — Ponderay, ID 83852."}</p>
                    <span className="teaser-card-cta">{block.ctaText || "Get Directions →"}</span>
                  </div>
                </Link>
              );
            }

            // customCard — target isn't necessarily internal, so a plain <a>
            // rather than next/link, same choice components/pages/BlockRenderer.tsx
            // makes for the "cta" block's buttonHref.
            const image = resolveMedia(block.image ?? null);
            return (
              <a key={key} href={block.href} className="teaser-card">
                <div className="teaser-card-img">
                  {image?.url && <img src={image.url} alt={image.alt ?? block.heading} loading="lazy" />}
                </div>
                <div className="teaser-card-body">
                  <h3>{block.heading}</h3>
                  {block.body && <p>{block.body}</p>}
                  <span className="teaser-card-cta">{block.ctaText || "Learn More →"}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
