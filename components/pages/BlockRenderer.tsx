import { RichText } from "@payloadcms/richtext-lexical/react";
import { GalleryGrid, type GalleryPhoto } from "@/components/home/GalleryGrid";

type MediaRef = { url?: string | null; alt?: string | null } | string | null | undefined;

export type PageBlock =
  | { blockType: "richText"; id?: string; content: unknown }
  | { blockType: "image"; id?: string; image: MediaRef; caption?: string | null; fullBleed?: boolean | null }
  | { blockType: "gallery"; id?: string; photos: GalleryPhoto[] }
  | { blockType: "cta"; id?: string; heading?: string | null; body?: string | null; buttonLabel: string; buttonHref: string }
  | {
      blockType: "twoColumn";
      id?: string;
      left?: { image?: MediaRef; content?: unknown } | null;
      right?: { image?: MediaRef; content?: unknown } | null;
    }
  | {
      blockType: "cardGrid";
      id?: string;
      heading?: string | null;
      cards: { image?: MediaRef; title: string; body?: string | null; priceLine?: string | null }[];
    };

function resolveImage(media: MediaRef): { url: string; alt: string } | null {
  const image = media && typeof media === "object" ? media : null;
  if (!image?.url) return null;
  return { url: image.url, alt: image.alt ?? "" };
}

function Column({ data }: { data?: { image?: MediaRef; content?: unknown } | null }) {
  const image = resolveImage(data?.image);
  return (
    <div className="page-block-col">
      {image?.url && <img src={image.url} alt={image.alt} />}
      {data?.content ? <RichText data={data.content as never} /> : null}
    </div>
  );
}

// Renders a Page doc's `layout` array in order. Shared between the plain
// server-rendered [slug] page and its Live Preview counterpart — same
// markup either way, just fed different data (see components/pages/PageView.tsx).
export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const key = block.id ?? i;
        switch (block.blockType) {
          case "richText":
            return (
              <div key={key} className="page-block text-panel">
                <RichText data={block.content as never} />
              </div>
            );

          case "image": {
            const image = resolveImage(block.image);
            if (!image?.url) return null;
            return (
              <figure key={key} className={`page-block page-block-image${block.fullBleed ? " page-block-image--full" : ""}`}>
                <img src={image.url} alt={block.caption ?? image.alt} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          }

          case "gallery":
            return (
              <div key={key} className="page-block">
                <GalleryGrid photos={block.photos ?? []} />
              </div>
            );

          case "cta":
            return (
              <div key={key} className="page-block page-block-cta">
                {block.heading && <h2>{block.heading}</h2>}
                {block.body && <p>{block.body}</p>}
                <a className="page-block-btn" href={block.buttonHref}>
                  {block.buttonLabel}
                </a>
              </div>
            );

          case "twoColumn":
            return (
              <div key={key} className="page-block page-block-two-col">
                <Column data={block.left} />
                <Column data={block.right} />
              </div>
            );

          case "cardGrid":
            return (
              <section key={key} className="page-block">
                {block.heading && (
                  <header className="section-head">
                    <h2 className="section-title">{block.heading}</h2>
                  </header>
                )}
                <div className="menu-grid">
                  {(block.cards ?? []).map((card, i) => {
                    const image = resolveImage(card.image);
                    return (
                      <article className="menu-card" key={i}>
                        {image?.url && (
                          <div className="menu-card-img">
                            <img src={image.url} alt={image.alt || card.title} />
                          </div>
                        )}
                        <div className="menu-card-body">
                          <h3>{card.title}</h3>
                          {card.body && <p>{card.body}</p>}
                          {card.priceLine && <div className="card-grid-price">{card.priceLine}</div>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
