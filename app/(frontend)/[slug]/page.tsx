import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { restaurantSchema } from "@/lib/structuredData";
import { PageView, type PageDoc } from "@/components/pages/PageView";
import { LivePage } from "@/components/pages/LivePage";

// Catches any single-segment path not already claimed by a literal route
// folder (/menu, /admin, /news, etc. — those always win, see the comment
// on RESERVED_SLUGS in collections/Pages.ts). This is what makes
// admin-created Pages docs reachable without touching the router.
async function getPage(slug: string): Promise<PageDoc | null> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "pages",
    // Local API bypasses access control by default, so `draft` alone won't
    // hide never-published drafts — filter explicitly.
    where: isDraftMode
      ? { slug: { equals: slug } }
      : { and: [{ slug: { equals: slug } }, { _status: { equals: "published" } }] },
    limit: 1,
    depth: 1,
    draft: isDraftMode,
  });
  return (result.docs[0] as unknown as PageDoc) ?? null;
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};

  const description = page.seo?.metaDescription ?? `${page.title} — East Meets West Dumplings Bar.`;

  return {
    title: `${page.title} — East Meets West Dumplings Bar`,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://eastmeetswestfoods.co/${page.slug}` },
    openGraph: {
      type: "website",
      siteName: "East Meets West Dumplings Bar",
      locale: "en_US",
      title: page.title,
      description,
      url: `https://eastmeetswestfoods.co/${page.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description,
    },
  };
}

export default async function DynamicPage({ params }: Params) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <main>
      <JsonLd data={restaurantSchema} />
      <section className="section">
        <div className="container">{isDraftMode ? <LivePage initialData={page} /> : <PageView page={page} />}</div>
      </section>
    </main>
  );
}
