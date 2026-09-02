import Link from "next/link";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import { buildOverlayVideoUrl, type AudioMode, type CaptionStyle, type CaptionPosition } from "@/lib/cloudinaryVideo";

export type NewsDoc = {
  id: string;
  title: string;
  slug: string;
  featuredImage?: { url?: string | null; alt?: string | null } | string | null;
  featuredVideo?: { url?: string | null; alt?: string | null } | string | null;
  cloudinaryVideo?: {
    publicId?: string | null;
    overlayText?: string | null;
    musicTrackId?: string | null;
    audioMode?: string | null;
    captionStyle?: string | null;
    captionPosition?: string | null;
    // The "last confirmed" shadow copies of the 6 fields above — see
    // collections/News.ts's own comment on them, and
    // components/news/LiveNewsPost.tsx, the only reader of these.
    confirmedPublicId?: string | null;
    confirmedOverlayText?: string | null;
    confirmedMusicTrackId?: string | null;
    confirmedAudioMode?: string | null;
    confirmedCaptionStyle?: string | null;
    confirmedCaptionPosition?: string | null;
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

// Shared between the plain server-rendered /news/[slug] page and its
// live-preview counterpart — same markup either way, just fed different data.
export function NewsPostView({
  post,
  videoPreviewOverride,
}: {
  post: NewsDoc;
  videoPreviewOverride?: VideoPreviewOverride;
}) {
  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;
  const plainVideo = post.featuredVideo && typeof post.featuredVideo === "object" ? post.featuredVideo : null;

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
          musicPublicId:
            MUSIC_LIBRARY.find((track) => track.id === post.cloudinaryVideo?.musicTrackId)?.publicId ?? null,
          audioMode: (post.cloudinaryVideo?.audioMode as AudioMode) || "replace",
          captionStyle: (post.cloudinaryVideo?.captionStyle as CaptionStyle) || "white-on-black",
          captionPosition: (post.cloudinaryVideo?.captionPosition as CaptionPosition) || "bottom",
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

      <header className="section-head">
        <div className="text-panel text-panel--inline">
          <h1 className="section-title">{post.title}</h1>
        </div>
      </header>

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
              Cloudinary Video Studio clip, often 1080x1920) scaled to that box's
              width renders much taller than the box, silently cropping off the
              bottom of the frame — exactly where the Video Studio's burned-in
              caption sits (see lib/cloudinaryVideo.ts's g_south/fl_relative
              overlay position). "news-post-video" has no forced aspect ratio, so
              the video always renders at its own natural height with nothing
              cropped. */}
          <div className="news-post-video" style={{ borderRadius: 4, overflow: "hidden" }}>
            <video src={video.url} controls playsInline style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>
      ) : needsFirstConfirmation ? (
        <p style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 24 }}>
          No video preview has been generated yet — open Step 1 in the editor and click &ldquo;Update preview&rdquo;
          in the Video Studio to see it here.
        </p>
      ) : (
        image?.url && (
          <div className="menu-card-img" style={{ marginBottom: 24, borderRadius: 4, overflow: "hidden" }}>
            <img src={image.url} alt={image.alt ?? post.title} />
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
