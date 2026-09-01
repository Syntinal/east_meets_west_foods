import Link from "next/link";
import { RichText } from "@/components/StyledRichText";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import { buildOverlayVideoUrl, type AudioMode, type CaptionStyle, type CaptionPosition } from "@/lib/cloudinaryVideo";

export type NewsDoc = {
  id: string;
  title: string;
  slug: string;
  type: "post" | "announcement";
  excerpt?: string | null;
  featuredImage?: { url?: string | null; alt?: string | null } | string | null;
  featuredVideo?: { url?: string | null; alt?: string | null } | string | null;
  cloudinaryVideo?: {
    publicId?: string | null;
    overlayText?: string | null;
    musicTrackId?: string | null;
    audioMode?: string | null;
    captionStyle?: string | null;
    captionPosition?: string | null;
  } | null;
  publishedDate?: string | null;
  // Lexical's serialized editor state — rendered via Payload's <RichText>.
  body: unknown;
};

// NEXT_PUBLIC_ (not the plain server-only var lib/socialPost.ts/
// collections/News.ts use) since this component renders in both a plain
// server component (/news/[slug]/page.tsx) and a "use client" one
// (components/news/LiveNewsPost.tsx) — the cloud name isn't secret, so one
// client-safe var covering both contexts is simpler than threading a
// separately-computed URL through both call sites.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Shared between the plain server-rendered /news/[slug] page and its
// live-preview counterpart — same markup either way, just fed different data.
export function NewsPostView({ post }: { post: NewsDoc }) {
  const image = post.featuredImage && typeof post.featuredImage === "object" ? post.featuredImage : null;
  const plainVideo = post.featuredVideo && typeof post.featuredVideo === "object" ? post.featuredVideo : null;

  // The Cloudinary overlay video (music + caption baked in) takes priority
  // over the plain Featured Video upload when present — same priority rule
  // collections/News.ts's afterChange hook uses for social posting.
  const cloudinaryPublicId = post.cloudinaryVideo?.publicId;
  const overlayVideoUrl =
    cloudinaryPublicId && CLOUD_NAME
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

  return (
    <>
      <Link href="/news" className="news-back-link">
        ← Back to News
      </Link>

      <header className="section-head">
        <div className="text-panel text-panel--inline">
          {post.type === "announcement" && <p className="card-tag">Announcement</p>}
          <h1 className="section-title">{post.title}</h1>
        </div>
      </header>

      {video?.url ? (
        // Deliberately NOT the "menu-card-img" class used below for the image
        // fallback — that class forces a fixed 4:3 box + overflow:hidden,
        // designed for small grid-card thumbnails. A portrait video (e.g. a
        // Cloudinary Video Studio clip, often 1080x1920) scaled to that box's
        // width renders much taller than the box, silently cropping off the
        // bottom of the frame — exactly where the Video Studio's burned-in
        // caption sits (see lib/cloudinaryVideo.ts's g_south/y_40 overlay
        // position). "news-post-video" has no forced aspect ratio, so the
        // video always renders at its own natural height with nothing cropped.
        <div className="news-post-video" style={{ marginBottom: 24, borderRadius: 4, overflow: "hidden" }}>
          <video src={video.url} controls playsInline style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
      ) : (
        image?.url && (
          <div className="menu-card-img" style={{ marginBottom: 24, borderRadius: 4, overflow: "hidden" }}>
            <img src={image.url} alt={image.alt ?? post.title} />
          </div>
        )
      )}

      <div className="text-panel news-body">
        <RichText data={post.body as never} />
      </div>
    </>
  );
}
