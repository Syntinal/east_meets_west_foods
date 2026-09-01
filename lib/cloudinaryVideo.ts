export type AudioMode = "replace" | "mix";

// Preset text/background color pairs, not a raw color picker — a picker
// would let the owner land on an unreadable combo (e.g. white-on-white)
// against a given clip. "white-on-black" is the original, only style this
// feature ever had; keep it as CAPTION_STYLES' effective default so every
// pre-existing post (captionStyle stored as null/undefined) renders
// byte-for-byte the same as before this option existed.
// "-no-bg" variants omit bgColor entirely (no backing box at all) — an
// option, not a replacement for the boxed styles, since plain text can be
// hard to read over busy footage; the owner picks per-post based on the clip.
export type CaptionStyle = "white-on-black" | "black-on-white" | "white-on-red" | "white-no-bg" | "black-no-bg";
const CAPTION_STYLES: Record<CaptionStyle, { textColor: string; bgColor?: string }> = {
  "white-on-black": { textColor: "white", bgColor: "00000080" },
  "black-on-white": { textColor: "black", bgColor: "ffffffcc" },
  // c8102e is this site's own --red brand color (app/(frontend)/globals.css).
  "white-on-red": { textColor: "white", bgColor: "c8102ecc" },
  "white-no-bg": { textColor: "white" },
  "black-no-bg": { textColor: "black" },
};

export type CaptionPosition = "top" | "center" | "bottom";
const CAPTION_POSITIONS: Record<CaptionPosition, string> = {
  top: "g_north,y_40",
  center: "g_center",
  bottom: "g_south,y_40",
};

type BuildOverlayVideoUrlArgs = {
  cloudName: string;
  publicId: string;
  overlayText?: string | null;
  // Cloudinary public_id of the chosen background track (see
  // lib/musicLibrary.ts), or null/undefined for "no music".
  musicPublicId?: string | null;
  audioMode?: AudioMode;
  captionStyle?: CaptionStyle;
  captionPosition?: CaptionPosition;
};

// The single source of truth for this feature's Cloudinary transformation
// URL — called from both the admin Video Studio's live preview
// (components/admin/CloudinaryVideoStudio.tsx, client-side, using
// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) and the real post page / social-post
// hook (collections/News.ts, server-side, using CLOUDINARY_CLOUD_NAME).
// Deliberately a pure function — takes `cloudName` as a param rather than
// reading `process.env` itself — so the exact same code runs unchanged in
// both places, matching this repo's usual "one function, not two near-
// duplicate copies" habit (see e.g. lib/socialPost.ts's truncate()).
//
// No render/upload/queue step here: Cloudinary generates and CDN-caches the
// composited result the first time this URL is actually requested. There's
// no separate "rendered video" asset to track — the transformation string
// in the URL *is* the whole video/music/text overlay, applied on the fly to
// the one raw video the owner uploaded.
export function buildOverlayVideoUrl({
  cloudName,
  publicId,
  overlayText,
  musicPublicId,
  audioMode = "replace",
  captionStyle = "white-on-black",
  captionPosition = "bottom",
}: BuildOverlayVideoUrlArgs): string {
  const segments: string[] = [];

  if (musicPublicId) {
    // Applied directly to the base video (not inside a layer): strip its
    // own audio track entirely ("replace"), or just turn it down so the
    // music sits on top of it instead of drowning it out ("mix"). Either
    // way this must come before the l_audio layer below, since it targets
    // the base asset's own audio, not the added track.
    segments.push(audioMode === "replace" ? "ac_none" : "e_volume:-50");
    // Inside a layer parameter, "/" is a transformation-component
    // delimiter, not part of the public_id — a folder-qualified public_id
    // (e.g. "music-library/upbeat-1") must use ":" instead
    // ("music-library:upbeat-1") or Cloudinary 404s trying to parse it as
    // two separate components. Confirmed against the real API: this isn't
    // documented as clearly as it should be, but reproduced directly (a
    // folder-qualified l_audio public_id 404'd until the "/" was swapped
    // for ":"). The base `publicId` at the end of the URL is a normal
    // delivery path, not a layer parameter, so it's untouched.
    segments.push(`l_audio:${musicPublicId.replace(/\//g, ":")}`);
    segments.push("fl_layer_apply");
  }

  const trimmedText = overlayText?.trim();
  if (trimmedText) {
    // Text/background colors from the chosen preset (see CAPTION_STYLES —
    // a fixed list, not a raw picker, so no combo can end up unreadable).
    // Position/offset from CAPTION_POSITIONS lives on the fl_layer_apply
    // component; "bottom" (the original, only position this feature ever
    // had) keeps clear of the native <video> control bar the same as before.
    // Text must be URL-encoded — Cloudinary's own delimiter characters
    // (",", "/", ":") inside the caption would otherwise break the
    // transformation string; encodeURIComponent escapes all three.
    const { textColor, bgColor } = CAPTION_STYLES[captionStyle];
    const bgSegment = bgColor ? `,b_rgb:${bgColor}` : "";
    segments.push(`l_text:Arial_60:${encodeURIComponent(trimmedText)},co_${textColor}${bgSegment}`);
    segments.push(`fl_layer_apply,${CAPTION_POSITIONS[captionPosition]}`);
  }

  segments.push("q_auto");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${segments.join("/")}/${publicId}.mp4`;
}
