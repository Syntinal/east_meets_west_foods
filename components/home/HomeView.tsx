import Link from "next/link";
import { RichText } from "@/components/StyledRichText";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import { GalleryGrid, type GalleryPhoto } from "./GalleryGrid";
import { TeaserCards, type TeaserBlock, type LatestNewsPost } from "./TeaserCards";

type MediaRef = { url?: string | null; alt?: string | null } | string | null;

export type HomeDoc = {
  header?: { logoImage?: MediaRef; tagline?: string | null } | null;
  hero?: { image?: MediaRef } | null;
  announcementBanner?: { badgeLabel?: string | null; linkText?: string | null } | null;
  mission?: {
    eyebrow?: string | null;
    heading?: string | null;
    statement?: string | null;
    location?: string | null;
  } | null;
  teaserCards?: TeaserBlock[] | null;
  gallery?: { eyebrow?: string | null; heading?: string | null; photos?: GalleryPhoto[] | null } | null;
  testimonialsSection?: { eyebrow?: string | null; heading?: string | null } | null;
  // Lexical's serialized editor state — rendered via Payload's <RichText>.
  seo?: { eyebrow?: string | null; heading?: string | null; body?: unknown } | null;
};

export type BannerDoc = { slug: string; title: string; excerpt?: string | null };
export type TestimonialDoc = { quote: string; authorName: string; rating: string; sourceUrl?: string | null };
export type TeaserNavLabels = { menu: string; sauce: string; story: string; news: string };

function resolveMedia(ref: MediaRef): { url: string; alt: string | null } | null {
  if (!ref || typeof ref !== "object" || !ref.url) return null;
  return { url: ref.url, alt: ref.alt ?? null };
}

// Shared between the plain server-rendered `/` page and its live-preview
// counterpart — same markup either way, just fed different data.
export function HomeView({
  home,
  banner,
  latestNewsPost,
  testimonials,
  navLabels,
}: {
  home: HomeDoc;
  banner: BannerDoc | null;
  latestNewsPost: LatestNewsPost;
  testimonials: TestimonialDoc[];
  navLabels: TeaserNavLabels;
}) {
  const logo = resolveMedia(home.header?.logoImage ?? null);
  const hero = resolveMedia(home.hero?.image ?? null);
  const galleryPhotos = home.gallery?.photos ?? [];
  const tagline = home.header?.tagline || "Ponderay, Idaho · Made fresh daily";
  const missionEyebrow = home.mission?.eyebrow || "Our Mission";
  const missionHeading = home.mission?.heading || "East Meets West Dumplings Bar";
  const bannerBadgeLabel = home.announcementBanner?.badgeLabel || "Announcement";
  const bannerLinkText = home.announcementBanner?.linkText || "Read more →";
  const galleryEyebrow = home.gallery?.eyebrow || "Gallery";
  const galleryHeading = home.gallery?.heading || "A Closer Look";
  const testimonialsEyebrow = home.testimonialsSection?.eyebrow || "What People Are Saying";
  const testimonialsHeading = home.testimonialsSection?.heading || "Testimonials";

  return (
    <>
      <header id="home" className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo-link" aria-label="East Meets West Dumplings Bar home">
            {logo?.url && (
              <img src={logo.url} alt={logo.alt ?? "East Meets West 美味 Dumplings Bar"} className="brand-sign" />
            )}
          </Link>
          <p className="brand-sub">{tagline}</p>
        </div>
      </header>

      {banner && (
        <div className="announcement-banner">
          <div className="container">
            <span className="announcement-banner-badge">
              <span aria-hidden="true">📣</span> {bannerBadgeLabel}
            </span>
            <p className="announcement-banner-text">
              <strong>{banner.title}</strong>
              {banner.excerpt ? ` — ${banner.excerpt}` : ""}
            </p>
            <Link href={`/news/${banner.slug}`} className="announcement-banner-link">
              {bannerLinkText}
            </Link>
          </div>
        </div>
      )}

      {hero?.url && (
        <div className="home-hero">
          <img src={hero.url} alt={hero.alt ?? "East Meets West Dumplings Bar"} loading="eager" />
        </div>
      )}

      <section className="mission">
        <div className="container">
          <div className="text-panel text-panel--inline">
            <p className="eyebrow">{missionEyebrow}</p>
            <h1 className="mission-h1">{missionHeading}</h1>
            {home.mission?.statement && <p className="mission-statement">{home.mission.statement}</p>}
            {home.mission?.location && <p className="mission-location">{home.mission.location}</p>}
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true">* &nbsp; * &nbsp; *</div>

      <TeaserCards blocks={home.teaserCards ?? []} navLabels={navLabels} latestNewsPost={latestNewsPost} />

      {galleryPhotos.length > 0 && (
        <section className="section section-cream">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{galleryEyebrow}</p>
              <h2 className="section-title">{galleryHeading}</h2>
            </div>
            <GalleryGrid photos={galleryPhotos} />
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="section section-cream">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{testimonialsEyebrow}</p>
              <h2 className="section-title">{testimonialsHeading}</h2>
            </div>
            <TestimonialCarousel testimonials={testimonials} />
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="text-panel text-panel--inline">
            {home.seo?.eyebrow && <p className="eyebrow">{home.seo.eyebrow}</p>}
            {home.seo?.heading && <h2>{home.seo.heading}</h2>}
            {home.seo?.body ? (
              <RichText data={home.seo.body as never} />
            ) : (
              <>
                <p>
                  Looking for authentic Chinese food near Sandpoint? East Meets West Dumplings Bar
                  serves Northern Chinese dumplings and bao buns from our spot in
                  Ponderay, Idaho — just a couple of minutes north of downtown Sandpoint, right on
                  US HWY 95. We&apos;re one of the only places in the Sandpoint and Bonner County area
                  making authentic, made-from-scratch dumplings fresh every day.
                </p>
                <p>
                  Whether you&apos;re craving dumplings in Sandpoint, fresh steamed bao buns, or a quick,
                  affordable lunch in Ponderay, Kootenai, or Sagle, we&apos;re an easy stop. Take a look at
                  our <Link href="/menu">full menu</Link>, discover{" "}
                  <Link href="/sauce">our homemade garlic sauce</Link>, or{" "}
                  <Link href="/contact">get directions</Link>. Call us at{" "}
                  <a href="tel:+12086276283">(208)&nbsp;627-6283</a>.
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
