import { RichText } from "@/components/StyledRichText";

type MediaRef = { url?: string | null; alt?: string | null } | string | null;

export type SauceDoc = {
  hero?: { image?: MediaRef } | null;
  content?: { heading?: string | null; body?: unknown } | null;
  pullQuote?: { quote?: string | null; citation?: string | null } | null;
};

function resolveMedia(ref: MediaRef): { url: string; alt: string | null } | null {
  if (!ref || typeof ref !== "object" || !ref.url) return null;
  return { url: ref.url, alt: ref.alt ?? null };
}

// Shared between the plain server-rendered /sauce page and its live-preview
// counterpart — same markup either way, just fed different data. Mirrors
// components/home/HomeView.tsx.
export function SauceView({ sauce }: { sauce: SauceDoc }) {
  const image = resolveMedia(sauce.hero?.image ?? null);

  return (
    <main>
      <section className="section">
        <div className="container sauce-grid">
          <div className="sauce-text text-panel">
            <p className="eyebrow">The Sauce</p>
            <h1 className="section-title">{sauce.content?.heading}</h1>
            {sauce.content?.body ? <RichText data={sauce.content.body as never} /> : null}
            {sauce.pullQuote?.quote && (
              <blockquote className="pull-quote">
                <p>&quot;{sauce.pullQuote.quote}&quot;</p>
                {sauce.pullQuote.citation && <cite>{sauce.pullQuote.citation}</cite>}
              </blockquote>
            )}
          </div>
          {image?.url && (
            <div className="sauce-photo">
              <img src={image.url} alt={image.alt ?? "Fresh dumplings on a tray, served with homemade garlic sauce"} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
