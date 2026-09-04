import { RichText } from "@/components/StyledRichText";
import { GalleryGrid, type GalleryPhoto } from "@/components/home/GalleryGrid";

type MediaRef = { url?: string | null; alt?: string | null } | string | null | undefined;

export type PageBlock =
  | { blockType: "richText"; id?: string; content: unknown }
  | { blockType: "image"; id?: string; image: MediaRef; caption?: string | null; size?: "normal" | "large" | "full" | null }
  | { blockType: "gallery"; id?: string; photos: GalleryPhoto[] }
  | { blockType: "cta"; id?: string; heading?: string | null; body?: string | null; buttonLabel: string; buttonHref: string }
  | {
      blockType: "twoColumn";
      id?: string;
      left?: { image?: MediaRef; video?: MediaRef; content?: unknown } | null;
      right?: { image?: MediaRef; video?: MediaRef; content?: unknown } | null;
    }
  | {
      blockType: "cardGrid";
      id?: string;
      heading?: string | null;
      cards: { image?: MediaRef; title: string; body?: unknown; priceLine?: string | null }[];
    }
  | { blockType: "file"; id?: string; file: MediaRef; label: string }
  | { blockType: "video"; id?: string; video: MediaRef; caption?: string | null }
  | { blockType: "quote"; id?: string; quote: string; citation?: string | null }
  | {
      blockType: "faq";
      id?: string;
      heading?: string | null;
      questions: { question: string; answer?: unknown }[];
    };

function resolveImage(media: MediaRef): { url: string; alt: string } | null {
  const image = media && typeof media === "object" ? media : null;
  if (!image?.url) return null;
  return { url: image.url, alt: image.alt ?? "" };
}

function Column({ data }: { data?: { image?: MediaRef; video?: MediaRef; content?: unknown } | null }) {
  const video = resolveImage(data?.video);
  const image = resolveImage(data?.image);
  return (
    <div className="page-block-col">
      {/* Video wins if both are set — same rule News' featuredImage/
          featuredVideo pair uses (see collections/News.ts). */}
      {video?.url ? (
        <video src={video.url} controls playsInline />
      ) : (
        image?.url && <img src={image.url} alt={image.alt} />
      )}
      {/* .text-panel is the site's standard readable-backing box — same
          treatment Story/Sauce give their text column (see
          app/(frontend)/globals.css's "READABLE BACKING" section) — so a
          Two Column block's text reads as part of the site, not bare copy
          floating on the page. Boxes just the text, not the image: the
          image already gets its own framed-photo treatment via the plain
          `img` rule below, and Story/Sauce never box their photos either. */}
      {data?.content ? (
        <div className="text-panel">
          <RichText data={data.content as never} />
        </div>
      ) : null}
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
            // "normal" (the default) adds no modifier class — same plain
            // .page-block-image styling as before this field existed.
            const sizeClass = block.size && block.size !== "normal" ? ` page-block-image--${block.size}` : "";
            return (
              <figure key={key} className={`page-block page-block-image${sizeClass}`}>
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
                          {card.body ? <RichText data={card.body as never} /> : null}
                          {card.priceLine && <div className="card-grid-price">{card.priceLine}</div>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );

          case "file": {
            const file = resolveImage(block.file);
            if (!file?.url) return null;
            return (
              <div key={key} className="page-block page-block-file">
                {/* `download` prompts a save instead of navigating —
                    appropriate for a PDF that's meant to be downloaded/
                    printed, not read as a webpage. */}
                <a className="page-block-btn" href={file.url} download>
                  {block.label}
                </a>
              </div>
            );
          }

          case "video": {
            const video = resolveImage(block.video);
            if (!video?.url) return null;
            return (
              <figure key={key} className="page-block page-block-video">
                <video src={video.url} controls playsInline />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          }

          case "quote":
            // Reuses .pull-quote verbatim — the same treatment
            // Story/Sauce give a featured quote (see StoryView.tsx).
            return (
              <blockquote key={key} className="page-block pull-quote">
                <p>&quot;{block.quote}&quot;</p>
                {block.citation && <cite>{block.citation}</cite>}
              </blockquote>
            );

          case "faq":
            // Reuses the real FAQ page's markup/CSS verbatim (.faq-list/
            // .faq-item/.faq-question/.faq-answer — see components/faq/
            // FaqView.tsx) so a page's own mini-FAQ looks identical to /faq.
            return (
              <div key={key} className="page-block text-panel text-panel--faq">
                {block.heading && <h2 className="section-title">{block.heading}</h2>}
                <dl className="faq-list">
                  {(block.questions ?? []).map((q, i) => (
                    <div className="faq-item" key={i}>
                      <dt className="faq-question">{q.question}</dt>
                      <dd className="faq-answer">{q.answer ? <RichText data={q.answer as never} /> : null}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
