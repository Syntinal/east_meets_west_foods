import { buildTextLayerSegments, type CaptionStyle, type CaptionPosition } from "./cloudinaryVideo";

// The photo equivalent of lib/cloudinaryVideo.ts's buildOverlayVideoUrl —
// same caption-overlay feature (text baked onto the image itself, same 5
// styles/3 positions), just for a News post's photo instead of its video.
// Reuses buildTextLayerSegments (and therefore the exact same CAPTION_STYLES/
// CAPTION_POSITIONS presets and the ",", "/" double-encoding fix) so the two
// media types can never drift apart on how a caption actually renders.
//
// Uses Cloudinary's `image/fetch` delivery type, not `image/upload` — News
// photos live wherever collections/Media.ts's own storage does (Vercel Blob
// in production, local disk in dev), not in Cloudinary's own asset library
// the way a Video Studio clip does. `fetch` lets Cloudinary pull the source
// photo from its real URL on first request and composite the overlay on the
// fly, CDN-caching the result — no separate upload/copy into Cloudinary
// needed, same "no render/queue step" property buildOverlayVideoUrl already
// has. Confirmed working against the real API (a real external photo URL,
// with a comma in the caption text to exercise the double-encoding path,
// came back 200 with the caption correctly rendered).

// TEXT_FONT/TEXT_MAX_WIDTH/TEXT_CORNER_RADIUS in cloudinaryVideo.ts are
// tuned for that feature's consistently-1080px-wide portrait video uploads
// (see TEXT_MAX_WIDTH's own comment) — News photos have no such consistent
// width (a phone photo, a wide banner, a small square crop are all equally
// likely), so those 3 knobs are scaled proportionally to each photo's own
// real width (available on every Payload Media doc via its `width` field)
// instead of reusing the literal pixel values directly. Confirmed this is
// necessary, not just cautious: applying video's literal w_900 text-layer
// width to an 800px-wide source photo widened the delivered image to 900px
// instead of wrapping the caption within it (the exact canvas-widening bug
// buildOverlayVideoUrl's own TEXT_MAX_WIDTH comment describes for video) —
// reproduced directly against the real API, fixed by scaling relative to
// the source width instead.
const REFERENCE_WIDTH = 1080;
const REFERENCE_FONT_SIZE = 60;
const REFERENCE_TEXT_MAX_WIDTH = 900;
const REFERENCE_CORNER_RADIUS = 35;
// Floors so a genuinely tiny source photo (a small crop, an old low-res
// upload) doesn't scale a knob down to something illegible or negative.
const MIN_FONT_SIZE = 24;
const MIN_TEXT_MAX_WIDTH = 160;
const MIN_CORNER_RADIUS = 8;
// Only used if a Media doc is somehow missing its own `width` (Payload
// normally always populates this for an image upload) — falls back to
// the same reference width these ratios are tuned against, i.e. behaves
// exactly like the video feature's fixed constants would.
const FALLBACK_IMAGE_WIDTH = REFERENCE_WIDTH;

function scale(base: number, min: number, imageWidth: number): number {
  return Math.max(min, Math.round((base / REFERENCE_WIDTH) * imageWidth));
}

type BuildOverlayImageUrlArgs = {
  cloudName: string;
  imageUrl: string;
  imageWidth?: number | null;
  overlayText?: string | null;
  captionStyle?: CaptionStyle;
  captionPosition?: CaptionPosition;
};

export function buildOverlayImageUrl({
  cloudName,
  imageUrl,
  imageWidth,
  overlayText,
  captionStyle = "white-on-black",
  captionPosition = "bottom",
}: BuildOverlayImageUrlArgs): string {
  const width = imageWidth && imageWidth > 0 ? imageWidth : FALLBACK_IMAGE_WIDTH;
  const segments = buildTextLayerSegments(overlayText, captionStyle, captionPosition, {
    font: `Arial_${scale(REFERENCE_FONT_SIZE, MIN_FONT_SIZE, width)}_center`,
    // Also capped at (width - 40) so the text layer can never itself be as
    // wide as (or wider than) the source photo, even on a photo small
    // enough that the scaled ratio alone wouldn't guarantee that — that gap
    // is what avoids the canvas-widening bug described above.
    maxWidth: Math.min(width - 40, scale(REFERENCE_TEXT_MAX_WIDTH, MIN_TEXT_MAX_WIDTH, width)),
    cornerRadius: scale(REFERENCE_CORNER_RADIUS, MIN_CORNER_RADIUS, width),
  });
  segments.push("f_auto,q_auto");
  // The remote source URL is a normal delivery-path segment (not inside a
  // layer parameter, unlike buildOverlayVideoUrl's l_audio public_id), so a
  // single encodeURIComponent is correct here — confirmed against the real
  // API, same as buildMusicPreviewUrl's own plain publicId path.
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${segments.join("/")}/${encodeURIComponent(imageUrl)}`;
}

// `number | string` covers an *unpopulated* upload relationship (just the
// related id, e.g. Payload's own generated types for a depth-0 fetch) —
// handled the same as "no image" below, same as this function's callers'
// own prior `typeof x === "object"` checks already did.
export type FeaturedImageRef =
  | { url?: string | null; alt?: string | null; width?: number | null }
  | string
  | number
  | null
  | undefined;

// The single place every call site (the post page, the News list, the
// homepage News teaser card, and the social-posting hook) resolves a News
// post's actual displayed photo — plain, or with its caption baked in, per
// CLAUDE.md's decision that the two should always match rather than the
// site showing one version and social media another. Swaps in the
// composited URL only when there's real caption text AND the source photo
// is reachable at a real absolute URL — Cloudinary's fetch delivery can't
// reach a relative path (this app's own local-dev `/api/media/file/...`
// URLs are relative; only Vercel Blob's production URLs are absolute), so
// local dev without a public tunnel falls back to the plain photo rather
// than a broken image. Every other case (no caption text, Cloudinary not
// configured) also falls back to plain — so every call site gets back a
// safe, always-renderable image with no special-casing of its own.
export function resolveFeaturedImageUrl({
  cloudName,
  image,
  captionText,
  captionStyle,
  captionPosition,
}: {
  cloudName?: string;
  image: FeaturedImageRef;
  captionText?: string | null;
  captionStyle?: string | null;
  captionPosition?: string | null;
}): { url: string; alt: string | null } | null {
  if (!image || typeof image !== "object" || !image.url) return null;
  const trimmedText = captionText?.trim();
  if (!trimmedText || !cloudName || !image.url.startsWith("http")) {
    return { url: image.url, alt: image.alt ?? null };
  }
  return {
    url: buildOverlayImageUrl({
      cloudName,
      imageUrl: image.url,
      imageWidth: image.width,
      overlayText: trimmedText,
      captionStyle: (captionStyle as CaptionStyle) || "white-on-black",
      captionPosition: (captionPosition as CaptionPosition) || "bottom",
    }),
    alt: image.alt ?? null,
  };
}
