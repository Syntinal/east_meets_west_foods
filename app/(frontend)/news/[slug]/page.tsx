import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import JsonLd from "@/components/JsonLd";
import { NewsPostView, type NewsDoc } from "@/components/news/NewsPostView";
import { LiveNewsPost } from "@/components/news/LiveNewsPost";

async function getPost(slug: string): Promise<NewsDoc | null> {
  const payload = await getPayload({ config });
  const { isEnabled: isDraftMode } = await draftMode();
  const result = await payload.find({
    collection: "news-posts",
    // Local API bypasses access control by default, so `draft` alone won't
    // hide never-published drafts — filter explicitly.
    where: isDraftMode
      ? { slug: { equals: slug } }
      : { and: [{ slug: { equals: slug } }, { _status: { equals: "published" } }] },
    limit: 1,
    depth: 1,
    draft: isDraftMode,
  });
  return (result.docs[0] as unknown as NewsDoc) ?? null;
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const description = post.excerpt ?? "News from East Meets West Dumplings Bar.";
  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage.url : null;

  return {
    title: `${post.title} — East Meets West Dumplings Bar`,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://eastmeetswestfoods.co/news/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: "East Meets West Dumplings Bar",
      locale: "en_US",
      title: post.title,
      description,
      url: `https://eastmeetswestfoods.co/news/${post.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function NewsPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { isEnabled: isDraftMode } = await draftMode();

  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          ...(post.publishedDate ? { datePublished: post.publishedDate } : {}),
          ...(image?.url ? { image: image.url } : {}),
        }}
      />
      <section className="section">
        <div className="container">
          {isDraftMode ? <LiveNewsPost initialData={post} /> : <NewsPostView post={post} />}
        </div>
      </section>
    </main>
  );
}
