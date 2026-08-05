import { BlockRenderer, type PageBlock } from "./BlockRenderer";

export type PageDoc = {
  id: string;
  title: string;
  slug: string;
  layout: PageBlock[];
  seo?: { metaDescription?: string | null } | null;
};

// Shared between the plain server-rendered /[slug] page and its
// live-preview counterpart — same markup either way, just fed different
// data (see LivePage.tsx). Matches the NewsPostView/LiveNewsPost pattern.
export function PageView({ page }: { page: PageDoc }) {
  return (
    <>
      <header className="section-head">
        <div className="text-panel text-panel--inline">
          <h1 className="section-title">{page.title}</h1>
        </div>
      </header>

      <div className="page-blocks">
        <BlockRenderer blocks={page.layout ?? []} />
      </div>
    </>
  );
}
