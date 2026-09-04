import Link from "next/link";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import {
  buildOverlayVideoUrl,
  type AudioMode,
  type CaptionStyle,
  type CaptionPosition,
  type CaptionFont,
} from "@/lib/cloudinaryVideo";
import { resolveFeaturedImageUrl } from "@/lib/cloudinaryImage";
import { buildClosingCardText } from "@/lib/closingCardText";

export type NewsDoc = {
  id: string;
  title: string;
  slug: string;
  featuredImage?: { id?: string | number; url?: string | null; alt?: string | null; width?: number | null } | string | null;
  featuredVideo?: { url?: string | null; alt?: string | null } | string | null;
  photoCaption?: {
    text?: string | null;
    captionStyle?: string | null;
    captionPosition?: string | null;
    // The "last confirmed" shadow copies — see collections/News.ts's own
    // comment on them, and components/news/LiveNewsPost.tsx, the only
    // reader of these.
    confirmedImageId?: string | null;
    confirmedText?: string | null;
    confirmedCaptionStyle?: string | null;
    confirmedCaptionPosition?: string | null;
  } | null;
  cloudinaryVideo?: {
    publicId?: string | null;
    overlayText?: string | null;
    textCard2?: string | null;
    textCard3?: string | null;
    durationSeconds?: number | null;
    addClosingCard?: boolean | null;
    musicTrackId?: string | null;
    audioMode?: string | null;
    captionStyle?: string | null;
    captionPosition?: string | null;
    captionFont?: string | null;
    // The "last confirmed" shadow copies of the fields above — see
    // collections/News.ts's own comment on them, and
    // components/news/LiveNewsPost.tsx, the only reader of these.
    confirmedPublicId?: string | null;
    confirmedOverlayText?: string | null;
    confirmedTextCard2?: string | null;
    confirmedTextCard3?: string | null;
    confirmedDurationSeconds?: number | null;
    confirmedAddClosingCard?: boolean | null;
    confirmedMusicTrackId?: string | null;
    confirmedAudioMode?: string | null;
    confirmedCaptionStyle?: string | null;
    confirmedCaptionPosition?: string | null;
    confirmedCaptionFont?: string | null;
  } | null;
  publishedDate?: string | null;
  // The whole post, exactly as the owner typed it — plain text, not rich
  // text (see collections/News.ts), so line breaks are preserved via CSS
  // rather than a markup format.
  message: string;
};

// NEXT_PUBLIC_ (not the plain server-only var lib/socialPost.ts/
// collections/News.ts use) since this component renders in both a plain
// server component (/news/[slug]/page.tsx) and a "use client" one
// (components/news/LiveNewsPost.tsx) — the cloud name isn't secret, so one
// client-safe var covering both contexts is simpler than threading a
// separately-computed URL through both call sites.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// A Live-Preview-only override for the Cloudinary overlay video — see
// components/news/LiveNewsPost.tsx, the only place that ever passes this.
// Never passed by the plain server-rendered page, which always computes
// `overlayVideoUrl` live from `post` itself below (correct there — a real
// published post should always show its real, current video).
type VideoPreviewOverride = {
  // The last "Update preview"-confirmed composited video's URL, or null if
  // nothing's been confirmed for the current video yet.
  url: string | null;
  // True when the owner has changed something (caption/music/style/etc.)
  // since that confirmed video was generated — still shows the confirmed
  // video (never a fresh recompute), just with a note that it's behind.
  isStale: boolean;
};

// A Live-Preview-only override for the photo's caption overlay — see
// components/news/LiveNewsPost.tsx, the only place that ever passes this.
// Never passed by the plain server-rendered page, which always resolves the
// photo live from `post` itself below via resolveFeaturedImageUrl (correct
// there — a real published post should always show its real, current
// caption). Unlike VideoPreviewOverride, `url` here is never null when a
// photo exists — falling back to the plain, uncaptioned photo is always a
// sensible thing to show while a caption hasn't been confirmed yet, unlike
// video (which has nothing sensible to fall back to).
type ImagePreviewOverride = {
  url: string | null;
  alt: string | null;
  isStale: boolean;
};

// Shared between the plain server-rendered /news/[slug] page and its
// live-preview counterpart — same markup either way, just fed different data.
export function NewsPostView({
  post,
  videoPreviewOverride,
  imagePreviewOverride,
}: {
  post: NewsDoc;
  videoPreviewOverride?: VideoPreviewOverride;
  imagePreviewOverride?: ImagePreviewOverride;
}) {
  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;
  const plainVideo = post.featuredVideo && typeof post.featuredVideo === "object" ? post.featuredVideo : null;

  // The actual photo to display — plain, or with its caption baked in (see
  // lib/cloudinaryImage.ts). imagePreviewOverride, when passed, wins outright
  // — see its own type comment for why recomputing live here would defeat
  // the point of the "confirmed" gating that override exists to carry (same
  // reasoning as videoPreviewOverride below).
  const resolvedImage = imagePreviewOverride
    ? imagePreviewOverride.url
      ? { url: imagePreviewOverride.url, alt: imagePreviewOverride.alt }
      : null
    : resolveFeaturedImageUrl({
        cloudName: CLOUD_NAME,
        image,
        captionText: post.photoCaption?.text,
        captionStyle: post.photoCaption?.captionStyle,
        captionPosition: post.photoCaption?.captionPosition,
      });

  // The Cloudinary overlay video (music + caption baked in) takes priority
  // over the plain Featured Video upload when present — same priority rule
  // collections/News.ts's afterChange hook uses for social posting.
  const cloudinaryPublicId = post.cloudinaryVideo?.publicId;
  // videoPreviewOverride, when passed, wins outright — see its own type
  // comment above for why recomputing live here would defeat the whole
  // point of the "confirmed" gating this override exists to carry.
  const overlayVideoUrl = videoPreviewOverride
    ? videoPreviewOverride.url
    : cloudinaryPublicId && CLOUD_NAME
      ? buildOverlayVideoUrl({
          cloudName: CLOUD_NAME,
          publicId: cloudinaryPublicId,
          overlayText: post.cloudinaryVideo?.overlayText,
          additionalTextCards: [post.cloudinaryVideo?.textCard2, post.cloudinaryVideo?.textCard3],
          closingCardText: post.cloudinaryVideo?.addClosingCard ? buildClosingCardText() : null,
          durationSeconds: post.cloudinaryVideo?.durationSeconds,
          musicPublicId:
            MUSIC_LIBRARY.find((track) => track.id === post.cloudinaryVideo?.musicTrackId)?.publicId ?? null,
          audioMode: (post.cloudinaryVideo?.audioMode as AudioMode) || "replace",
          captionStyle: (post.cloudinaryVideo?.captionStyle as CaptionStyle) || "white-on-black",
          captionPosition: (post.cloudinaryVideo?.captionPosition as CaptionPosition) || "bottom",
          captionFont: (post.cloudinaryVideo?.captionFont as CaptionFont) || "arial",
        })
      : null;
  const video = overlayVideoUrl ? { url: overlayVideoUrl } : plainVideo;
  // Only meaningful when videoPreviewOverride is present at all (i.e. we're
  // in Live Preview and a Cloudinary video is attached) — distinguishes
  // "no video ever confirmed yet" from "no video at all," so the owner gets
  // a clear next step instead of the plain-photo fallback silently standing
  // in for a video that's actually just waiting on its first "Update
  // preview" click.
  const needsFirstConfirmation = Boolean(videoPreviewOverride) && !videoPreviewOverride?.url && Boolean(cloudinaryPublicId);

  return (
    <>
      <Link href="/news" className="news-back-link">
        ← Back to News
      </Link>

      {/* Visually hidden, not removed — see globals.css's own comment on
          .visually-hidden. post.title is always derived from the message's
          own first line (lib/newsText.ts), so showing it here as a normal
          on-page heading would repeat that first line right back at the
          reader, directly above the body paragraph that already starts
          with it. A real <h1> still needs to exist on the page — for
          screen-reader heading navigation and a normal single-heading page
          structure — it just doesn't need to be seen twice. */}
      <h1 className="visually-hidden">{post.title}</h1>

      {video?.url ? (
        <div style={{ marginBottom: 24 }}>
          {videoPreviewOverride?.isStale && (
            <p style={{ fontSize: 12, color: "var(--theme-warning-500, #f5a623)", marginBottom: 8 }}>
              You&rsquo;ve changed something in the Video Studio since this preview was made — click &ldquo;Update
              preview&rdquo; there to see the latest version here.
            </p>
          )}
          {/* Deliberately NOT the "menu-card-img" class used below for the image
              fallback — that class forces a fixed 4:3 box + overflow:hidden,
              designed for small grid-card thumbnails. A portrait video (e.g. a
              Cloudinary Video Studio clip, often 1080x1920) sized to the
              viewport's own height (see .news-post-video video in globals.css)
              instead of the content column's width, so the owner sees the
              whole clip without scrolling, the way a Reels/TikTok-style video
              is meant to be watched — nothing cropped, nothing needing a fixed
              aspect-ratio box the way the thumbnail grid does. */}
          <div className="news-post-video">
            <video src={video.url} controls playsInline />
          </div>
        </div>
      ) : needsFirstConfirmation ? (
        <p style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 24 }}>
          No video preview has been generated yet — open Step 1 in the editor and click &ldquo;Update preview&rdquo;
          in the Video Studio to see it here.
        </p>
      ) : (
        resolvedImage?.url && (
          <div style={{ marginBottom: 24 }}>
            {imagePreviewOverride?.isStale && (
              <p style={{ fontSize: 12, color: "var(--theme-warning-500, #f5a623)", marginBottom: 8 }}>
                You&rsquo;ve changed the photo caption since this preview was made — click &ldquo;Update
                preview&rdquo; in Step 1 to see the latest version here.
              </p>
            )}
            <div className="menu-card-img" style={{ borderRadius: 4, overflow: "hidden" }}>
              <img src={resolvedImage.url} alt={resolvedImage.alt ?? post.title} />
            </div>
          </div>
        )
      )}

      <div className="text-panel news-body">
        {/* Plain text, not rich text (see collections/News.ts's `message`
            field) — whiteSpace: pre-wrap preserves the owner's own line
            breaks without needing a markup format. */}
        <p style={{ whiteSpace: "pre-wrap" }}>{post.message}</p>
      </div>
    </>
  );
}
