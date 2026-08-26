import { RichText } from "@/components/StyledRichText";

type MediaRef = { url?: string | null; alt?: string | null } | string | null;

export type StoryDoc = {
  hero?: { image?: MediaRef } | null;
  content?: { heading?: string | null; body?: unknown } | null;
  pullQuote?: { quote?: string | null; citation?: string | null } | null;
};

function resolveMedia(ref: MediaRef): { url: string; alt: string | null } | null {
  if (!ref || typeof ref !== "object" || !ref.url) return null;
  return { url: ref.url, alt: ref.alt ?? null };
}

// Shared between the plain server-rendered /story page and its live-preview
// counterpart — same markup either way, just fed different data. Mirrors
// components/home/HomeView.tsx.
export function StoryView({ story }: { story: StoryDoc }) {
  const image = resolveMedia(story.hero?.image ?? null);

  return (
    <main>
      <section className="section">
        <div className="container story-grid">
          {image?.url && (
            <div className="story-photo">
              <img src={image.url} alt={image.alt ?? "Chef Richard at East Meets West Dumplings Bar, Ponderay Idaho"} />
            </div>
          )}
          <div className="story-text text-panel">
            <p className="eyebrow">Our Story</p>
            <h1 className="section-title">{story.content?.heading}</h1>
            {story.content?.body ? <RichText data={story.content.body as never} /> : null}
            {story.pullQuote?.quote && (
              <blockquote className="pull-quote">
                <p>&quot;{story.pullQuote.quote}&quot;</p>
                {story.pullQuote.citation && <cite>{story.pullQuote.citation}</cite>}
              </blockquote>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
