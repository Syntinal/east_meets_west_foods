export type AudioMode = "replace" | "mix";

// Preset text/background color pairs, not a raw color picker — a picker
// would let the owner land on an unreadable combo (e.g. white-on-white)
// against a given clip. "white-on-black" is the original, only style this
// feature ever had; keep it as CAPTION_STYLES' effective default so every
// pre-existing post (captionStyle stored as null/undefined) renders
// the same as before this option existed — its key is unchanged, only its
// actual color moved from black to dark gray (333333, still the same 50%
// alpha as before) per the owner's request that it read as a soft dark
// panel over the footage rather than a flat black bar.
// "-no-bg" variants omit bgColor entirely (no backing box at all) — an
// option, not a replacement for the boxed styles, since plain text can be
// hard to read over busy footage; the owner picks per-post based on the clip.
export type CaptionStyle = "white-on-black" | "black-on-white" | "white-on-red" | "white-no-bg" | "black-no-bg";
const CAPTION_STYLES: Record<CaptionStyle, { textColor: string; bgColor?: string }> = {
  "white-on-black": { textColor: "white", bgColor: "33333380" },
  "black-on-white": { textColor: "black", bgColor: "ffffffcc" },
  // c8102e is this site's own --red brand color (app/(frontend)/globals.css).
  "white-on-red": { textColor: "white", bgColor: "c8102ecc" },
  "white-no-bg": { textColor: "white" },
  "black-no-bg": { textColor: "black" },
};

export type CaptionPosition = "top" | "center" | "bottom";
// "bottom"'s offset used to be a fixed 40px (y_40) — negligible on a tall
// clip (these are often 1080x1920, see buildOverlayVideoUrl's own comment),
// so the caption sat right behind the native <video> control bar (play
// button, progress bar, etc.) instead of clearing it, only becoming
// readable once those controls faded out. `fl_relative` makes the y
// offset a fraction of the video's own height instead of a fixed pixel
// count, so it scales correctly across different clip resolutions —
// y_0.12 lands the caption solidly inside the bottom quarter of the frame
// (not flush against the very bottom edge, where the controls sit).
const CAPTION_POSITIONS: Record<CaptionPosition, string> = {
  top: "g_north,y_40",
  center: "g_center",
  bottom: "g_south,y_0.12,fl_relative",
};

// Max width (px) the overlay caption text is allowed to render at before
// Cloudinary wraps it onto another line — see its use below for why this
// has to be an absolute pixel value, not a percentage of the clip's own
// width. 900px on this feature's standard 1080px-wide upload leaves ~90px
// of margin on each side — confirmed against a real uploaded clip that
// this neither touches the frame edges nor gets clipped/expands the canvas
// the way an unconstrained width did.
const TEXT_MAX_WIDTH = 900;

// Corner radius (px) rounding the caption's background box, and the font
// modifier that horizontally centers wrapped text within it — both added
// per the owner's request that the box read a bit softer, and that
// multi-line captions stay centered rather than ragged-left regardless of
// which CaptionPosition is chosen. Confirmed directly against the real
// Cloudinary API (not just docs) that `r_<px>` only takes effect when
// comma'd directly into the l_text component itself, alongside co_/b_ —
// chaining it as its own separate step (before or after fl_layer_apply)
// silently no-ops, and the reserved `r_max` keyword way overshoots (it
// rounds into a stadium/ellipse that clips into the text itself, since the
// box has almost no internal padding around the glyphs).
//
// 35px, not something smaller — this was wrong once already and worth
// recording why. Cloudinary's *video* transcode pipeline (ffmpeg-based)
// and its *image*/thumbnail-derivative pipeline (the `.jpg` you get by
// swapping the extension on this same URL) do NOT apply `r_` identically,
// despite sharing transformation syntax: a `.jpg` grabbed from this exact
// URL shows a clean rounded corner all the way down to ~10px, but the real
// `.mp4` output silently ignores anything below ~30px — confirmed by
// downloading the actual video (not the jpg) and extracting a real frame
// with ffmpeg at r_20/25/30/35/40/50/80/120: 20 and 25 are indistinguishable
// from r_0, 35 through 120 all produce byte-identical output (the video
// pipeline appears to clamp to one effective radius somewhere in that
// range), and only `r_max` goes further, into the glyph-clipping stadium
// shape above. 35 is the smallest value confirmed to actually round the
// real delivered video, on both a short single-line caption and a
// 2-line wrapped one — verifying against the `.jpg` derivative alone is
// not sufficient for this feature, since that isn't what ever actually
// ships. `_center` is a text-style modifier on the font descriptor
// (`Arial_60_center`), not a separate parameter.
const TEXT_CORNER_RADIUS = 35;
const TEXT_FONT = "Arial_60_center";

// See the comment inside buildOverlayVideoUrl's text-layer branch for the
// full reasoning: plain encodeURIComponent leaves "," and "/" as single-
// encoded (%2C / %2F), which Cloudinary decodes back into the literal,
// still-a-delimiter character before it ever parses the caption text as
// content — breaking the transformation string (confirmed as a real 404
// against the live API). Re-escaping just those two sequences' own "%"
// makes them survive that first decode pass and only resolve to the real
// character on the second (display) decode. ":" doesn't need this — it
// survives single-encoded, confirmed working as-is.
function encodeCaptionText(text: string): string {
  return encodeURIComponent(text).replace(/%2C/g, "%252C").replace(/%2F/g, "%252F");
}

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

// Shared by buildOverlayVideoUrl (the real .mp4) and
// buildCaptionFramePreviewUrl (the cheap still-frame stand-in used for live
// caption auditioning — see that function's own comment) so the two can
// never drift apart on the actual text-layer transformation syntax. Returns
// the `l_text:...` + `fl_layer_apply,...` segment pair, or an empty array
// when there's no caption text to render.
function buildTextLayerSegments(
  overlayText: string | null | undefined,
  captionStyle: CaptionStyle,
  captionPosition: CaptionPosition,
): string[] {
  const trimmedText = overlayText?.trim();
  if (!trimmedText) return [];
  const { textColor, bgColor } = CAPTION_STYLES[captionStyle];
  const bgSegment = bgColor ? `,b_rgb:${bgColor}` : "";
  return [
    `l_text:${TEXT_FONT}:${encodeCaptionText(trimmedText)},co_${textColor}${bgSegment},w_${TEXT_MAX_WIDTH},c_fit,r_${TEXT_CORNER_RADIUS}`,
    `fl_layer_apply,${CAPTION_POSITIONS[captionPosition]}`,
  ];
}

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

  // Text/background colors from the chosen preset (see CAPTION_STYLES — a
  // fixed list, not a raw picker, so no combo can end up unreadable).
  // Position/offset from CAPTION_POSITIONS lives on the fl_layer_apply
  // component; "bottom"'s offset is relative (see CAPTION_POSITIONS' own
  // comment) so it clears the native <video> control bar regardless of the
  // clip's resolution, rather than a fixed pixel count that turned out not
  // to on a tall clip.
  // Text must be URL-encoded — Cloudinary's own delimiter characters
  // (",", "/", ":") inside the caption would otherwise break the
  // transformation string. `encodeURIComponent` alone is NOT enough for ","
  // or "/", though — confirmed directly against the real API that a
  // caption like "Dumplings, hot off the wok!" 404s the entire video even
  // single-encoded (%2C): Cloudinary decodes the URL once before splitting
  // it into transformation components, so a single-encoded delimiter
  // character decodes right back into a literal "," or "/" *before* that
  // split happens and still breaks the string. It needs double-encoding
  // (%252C) so it survives that first decode pass still encoded, and only
  // becomes the literal character on the second decode when the text is
  // actually rendered — see encodeCaptionText() below. ":" doesn't have
  // this problem (confirmed working single-encoded, as %3A) — only ","
  // and "/" needed this.
  //
  // `w_TEXT_MAX_WIDTH,c_fit` is required, not optional — with no width
  // constraint at all, a caption longer than the clip is wide renders as
  // one unbroken line and either gets clipped at the frame edges or
  // (confirmed against the real API) makes Cloudinary widen the whole
  // output canvas to fit it, silently delivering a video wider than the one
  // actually uploaded. `c_fit` is what makes Cloudinary wrap the text
  // across multiple lines to stay within that width instead of doing
  // either of those. Deliberately an absolute pixel value, not a
  // percentage: tried `fl_relative` (which correctly makes an *offset*
  // relative to the base video — see CAPTION_POSITIONS above) on this
  // width too, and confirmed against the real API that it's simply ignored
  // for a text layer's own width — the output was identical to having no
  // width constraint at all (same wrongly-widened canvas, same unwrapped
  // single line). TEXT_MAX_WIDTH is sized for this feature's established
  // clip width (uploads are consistently 1080px wide portrait video —
  // confirmed against a real uploaded clip), leaving a margin on each
  // side; a clip narrower than that would need this revisited.
  segments.push(...buildTextLayerSegments(overlayText, captionStyle, captionPosition));

  segments.push("q_auto");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${segments.join("/")}/${publicId}.mp4`;
}

// Number of seconds into the clip to grab the still frame
// buildCaptionFramePreviewUrl auditions caption text against. Fixed rather
// than owner-controlled — a control here would be one more thing to explain
// for a single, low-stakes preview-accuracy tradeoff. 1 second, not 0,
// specifically to skip a clip's opening frame, which is disproportionately
// likely to still be black/fading in on freshly-recorded phone video.
export const CAPTION_FRAME_OFFSET_SECONDS = 1;

type BuildCaptionFramePreviewUrlArgs = {
  cloudName: string;
  publicId: string;
  overlayText?: string | null;
  captionStyle?: CaptionStyle;
  captionPosition?: CaptionPosition;
};

// A cheap stand-in for buildOverlayVideoUrl's real .mp4, used only so the
// owner can audition caption text/style/position live (on every debounced
// keystroke and every style/position click) without spending a real video
// transformation each time. Cloudinary will hand back a single still frame
// from an uploaded video if you request its public_id with an image
// extension instead of `.mp4` — a "video-to-image" derivative, confirmed
// viable here already (see buildOverlayVideoUrl's TEXT_CORNER_RADIUS
// comment, which grabbed a `.jpg` off this exact URL shape while
// investigating corner-radius rendering) — and a single-frame image render
// is far lighter for Cloudinary to generate than re-encoding the whole
// clip, so recomputing this on every keystroke is safe in a way recomputing
// the real video isn't. This function is ONLY ever used for that live
// preview — the real, actually-posted video always goes through
// buildOverlayVideoUrl, only when the owner explicitly asks for it (see
// CloudinaryVideoStudio.tsx's "Update preview" button).
//
// No audio segments (ac_none/e_volume/l_audio) — a still frame has no audio
// track to touch, and auditioning music is handled separately via
// buildMusicPreviewUrl (the raw track's own file, no video/frame involved
// at all).
export function buildCaptionFramePreviewUrl({
  cloudName,
  publicId,
  overlayText,
  captionStyle = "white-on-black",
  captionPosition = "bottom",
}: BuildCaptionFramePreviewUrlArgs): string {
  const segments: string[] = [`so_${CAPTION_FRAME_OFFSET_SECONDS}`];
  segments.push(...buildTextLayerSegments(overlayText, captionStyle, captionPosition));
  segments.push("q_auto");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${segments.join("/")}/${publicId}.jpg`;
}

// Lets the owner audition a background-music track before picking it (see
// components/admin/CloudinaryVideoStudio.tsx's Preview button) — a short
// raw clip of the track itself, not composited onto any video. Trimmed via
// `so_0,eo_<seconds>` (start/end offset, in seconds) rather than serving
// the whole track, both to keep the preview small and because it's the
// *right* part to preview: a track longer than the clip it's added to gets
// trimmed down to the video's own length when actually used (see CLAUDE.md
// item 28's "trimmed to match, never extended" finding) — so the
// beginning of a track is genuinely what a short clip will sound like, not
// just the cheapest part to stream. Confirmed directly against the real
// API: a 3-minute track's full file is ~5.7MB; this trimmed preview comes
// back at ~500KB regardless of the source track's real length.
//
// No folder/":" swap needed here (unlike buildOverlayVideoUrl's l_audio
// layer parameter) — publicId is the base delivery path at the end of the
// URL, not inside a layer, so a folder-qualified id works as a normal path
// segment.
export const MUSIC_PREVIEW_SECONDS = 20;

export function buildMusicPreviewUrl({ cloudName, publicId }: { cloudName: string; publicId: string }): string {
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,eo_${MUSIC_PREVIEW_SECONDS}/${publicId}.mp3`;
}
