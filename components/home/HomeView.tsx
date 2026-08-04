import Link from "next/link";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { NAV_PAGES } from "@/lib/navigation";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import { GalleryGrid, type GalleryPhoto } from "./GalleryGrid";

type MediaRef = { url?: string | null; alt?: string | null } | string | null;

export type HomeDoc = {
  header?: { logoImage?: MediaRef } | null;
  hero?: { image?: MediaRef } | null;
  mission?: { statement?: string | null; location?: string | null } | null;
  teaserCards?: {
    menu?: { image?: MediaRef; body?: string | null } | null;
    sauce?: { image?: MediaRef; body?: string | null } | null;
    story?: { image?: MediaRef; body?: string | null } | null;
    news?: { image?: MediaRef; body?: string | null } | null;
  } | null;
  gallery?: { photos?: GalleryPhoto[] | null } | null;
  // Lexical's serialized editor state — rendered via Payload's <RichText>.
  seo?: { eyebrow?: string | null; heading?: string | null; body?: unknown } | null;
};

export type BannerDoc = { slug: string; title: string; excerpt?: string | null };
export type TestimonialDoc = { quote: string; authorName: string; rating: string; sourceUrl?: string | null };

function resolveMedia(ref: MediaRef): { url: string; alt: string | null } | null {
  if (!ref || typeof ref !== "object" || !ref.url) return null;
  return { url: ref.url, alt: ref.alt ?? null };
}

function navLabel(key: "menu" | "sauce" | "story" | "news"): string {
  return NAV_PAGES.find((page) => page.key === key)?.label ?? key;
}

// Shared between the plain server-rendered `/` page and its live-preview
// counterpart — same markup either way, just fed different data.
export function HomeView({
  home,
  banner,
  showNewsTeaser,
  testimonials,
}: {
  home: HomeDoc;
  banner: BannerDoc | null;
  showNewsTeaser: boolean;
  testimonials: TestimonialDoc[];
}) {
  const logo = resolveMedia(home.header?.logoImage ?? null);
  const hero = resolveMedia(home.hero?.image ?? null);
  const menuCard = { image: resolveMedia(home.teaserCards?.menu?.image ?? null), body: home.teaserCards?.menu?.body };
  const sauceCard = {
    image: resolveMedia(home.teaserCards?.sauce?.image ?? null),
    body: home.teaserCards?.sauce?.body,
  };
  const storyCard = {
    image: resolveMedia(home.teaserCards?.story?.image ?? null),
    body: home.teaserCards?.story?.body,
  };
  const newsCard = { image: resolveMedia(home.teaserCards?.news?.image ?? null), body: home.teaserCards?.news?.body };
  const galleryPhotos = home.gallery?.photos ?? [];

  return (
    <>
      <header id="home" className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo-link" aria-label="East Meets West Dumplings Bar home">
            {logo?.url && (
              <img src={logo.url} alt={logo.alt ?? "East Meets West 美味 Dumplings Bar"} className="brand-sign" />
            )}
          </Link>
          <p className="brand-sub">Ponderay, Idaho &nbsp;&middot;&nbsp; Hand-folded daily</p>
        </div>
      </header>

      {banner && (
        <div className="announcement-banner">
          <div className="container">
            <span className="announcement-banner-badge">
              <span aria-hidden="true">📣</span> Announcement
            </span>
            <p className="announcement-banner-text">
              <strong>{banner.title}</strong>
              {banner.excerpt ? ` — ${banner.excerpt}` : ""}
            </p>
            <Link href={`/news/${banner.slug}`} className="announcement-banner-link">
              Read more →
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
            <p className="eyebrow">Our Mission</p>
            <h1 className="mission-h1">East Meets West Dumplings Bar</h1>
            {home.mission?.statement && <p className="mission-statement">{home.mission.statement}</p>}
            {home.mission?.location && <p className="mission-location">{home.mission.location}</p>}
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true">* &nbsp; * &nbsp; *</div>

      <section className="teaser-section">
        <div className="container">
          <div className="teaser-grid">
            <Link href="/menu" className="teaser-card">
              <div className="teaser-card-img">
                {menuCard.image?.url && <img src={menuCard.image.url} alt={menuCard.image.alt ?? "Menu"} loading="lazy" />}
              </div>
              <div className="teaser-card-body">
                <h3>{navLabel("menu")}</h3>
                {menuCard.body && <p>{menuCard.body}</p>}
                <span className="teaser-card-cta">See the Menu →</span>
              </div>
            </Link>

            <Link href="/sauce" className="teaser-card">
              <div className="teaser-card-img">
                {sauceCard.image?.url && (
                  <img src={sauceCard.image.url} alt={sauceCard.image.alt ?? "The Sauce"} loading="lazy" />
                )}
              </div>
              <div className="teaser-card-body">
                <h3>{navLabel("sauce")}</h3>
                {sauceCard.body && <p>{sauceCard.body}</p>}
                <span className="teaser-card-cta">Learn More →</span>
              </div>
            </Link>

            <Link href="/story" className="teaser-card">
              <div className="teaser-card-img">
                {storyCard.image?.url && (
                  <img src={storyCard.image.url} alt={storyCard.image.alt ?? "Our Story"} loading="lazy" />
                )}
              </div>
              <div className="teaser-card-body">
                <h3>{navLabel("story")}</h3>
                {storyCard.body && <p>{storyCard.body}</p>}
                <span className="teaser-card-cta">Read Our Story →</span>
              </div>
            </Link>

            {showNewsTeaser && (
              <Link href="/news" className="teaser-card">
                <div className="teaser-card-img">
                  {newsCard.image?.url && (
                    <img src={newsCard.image.url} alt={newsCard.image.alt ?? "News"} loading="lazy" />
                  )}
                </div>
                <div className="teaser-card-body">
                  <h3>{navLabel("news")}</h3>
                  {newsCard.body && <p>{newsCard.body}</p>}
                  <span className="teaser-card-cta">See What&apos;s New →</span>
                </div>
              </Link>
            )}

            <Link href="/contact" className="teaser-card">
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
                <h3>Visit / Contact</h3>
                <p>476534 US HWY 95, Suite B — Ponderay, ID 83852.</p>
                <span className="teaser-card-cta">Get Directions →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {galleryPhotos.length > 0 && (
        <section className="section section-cream">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Gallery</p>
              <h2 className="section-title">A Closer Look</h2>
            </div>
            <GalleryGrid photos={galleryPhotos} />
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="section section-cream">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">What People Are Saying</p>
              <h2 className="section-title">Testimonials</h2>
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
                  serves hand-folded Northern Chinese dumplings and bao buns from our spot in
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
