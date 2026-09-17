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

// Corner radius on the video caption's background box was removed
// entirely, per the owner — the box's square corners were still visibly
// showing through/alongside the rounded corners rather than a clean rounded
// box (this feature's own earlier investigation had found the video
// transcode pipeline handles `r_` differently from the image pipeline —
// see git history on this comment for that investigation — but "still
// shows corners" means even the value that investigation settled on wasn't
// actually clean; simplest fix is dropping it rather than chasing another
// value). `cornerRadius` in buildTextLayerBase's `sizing` param is still
// there and still used by lib/cloudinaryImage.ts's photo captions (a
// different, image-pipeline code path the owner didn't ask to change) —
// just no longer defaulted-to for video, which is what actually removes it
// from every video caption (buildCardSegments below never passes one).
//
// `_center` is a text-style modifier chained onto the font descriptor
// itself (e.g. `Arial_60_center`, or `Montserrat_60_bold_center` — see
// buildFontDescriptor below), not a separate parameter — horizontally
// centers wrapped text within the box regardless of which CaptionPosition
// is chosen.
const TEXT_FONT_SIZE = 60;

// A curated list, not a free-text font picker — same reasoning as
// CAPTION_STYLES being fixed presets rather than a raw color picker: a few
// good, legible choices beat an open-ended one that could land on something
// illegible or off-brand. All are real Google Fonts (Cloudinary renders any
// Google Font by name directly in a text-overlay descriptor — a documented,
// standard Cloudinary capability, no separate upload/hosting needed on our
// end) except "arial", the original default, kept as-is so an existing post
// with no captionFont set (null/undefined) renders exactly as it did before
// this option existed. The other four are common, bold, high-legibility
// display/sans faces associated with social-media-style caption overlays
// (Instagram/TikTok-style text cards, similar to the reference video that
// prompted this feature) rather than a plain body-text font. "anton" has no
// `bold` modifier — it's a single-weight display face, already bold by
// design; Cloudinary's `_bold` modifier on a font with no real bold variant
// is more likely to no-op or look wrong than help.
export type CaptionFont = "arial" | "montserrat" | "poppins" | "anton" | "oswald";
const CAPTION_FONTS: Record<CaptionFont, { family: string; bold?: boolean }> = {
  arial: { family: "Arial" },
  montserrat: { family: "Montserrat", bold: true },
  poppins: { family: "Poppins", bold: true },
  anton: { family: "Anton" },
  oswald: { family: "Oswald", bold: true },
};

function buildFontDescriptor(font: CaptionFont): string {
  const { family, bold } = CAPTION_FONTS[font];
  return `${family}_${TEXT_FONT_SIZE}_${bold ? "bold_" : ""}center`;
}

// Extra top/bottom breathing room around the caption text, inside its
// background box — per the owner's request that the box felt cramped
// against the text. Cloudinary's text-overlay API has no documented
// padding parameter of its own (the box is auto-fit tightly to the text by
// its own font-rendering engine); the closest real lever is drawing a
// border in the SAME color as the background so it reads as an extension of
// the box rather than a visible outline (`bo_<px>px_solid_<same rgb as
// bgColor>`) — this is a common workaround for this exact Cloudinary
// limitation, not a documented "padding" feature. Applies to all 4 sides
// (Cloudinary's border syntax doesn't support per-side widths the way CSS
// does), not just top/bottom as asked — the closest approximation available
// without a fundamentally different overlay construction. 18px, the
// midpoint of the requested 12-24px range. Only added when there's a real
// background to extend (the "-no-bg" caption styles have no box at all, so
// a border there would draw a visible outline around bare text instead of
// adding padding). NOT verified against the real Cloudinary API this
// session, per the owner's explicit ask to skip that this round — confirm
// visually once it's live, this is this function's best-available technique
// rather than a confirmed one.
const TEXT_PADDING_PX = 18;

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

// Fade duration (ms) applied to caption text — a static caption sitting on
// screen with no transition reads as "pasted on" rather than an intentional
// edit. Fixed rather than owner-configurable: this is a subtle polish knob,
// not a real decision the owner needs to make per post. Confirmed working
// against the real Cloudinary API (see buildCardSegments' own comment for
// the `du_` requirement this needed to actually work) — the equivalent
// music fade was also tried this session but didn't hold up against a real
// test and was reverted; see pushMusicSegments' own comment below.
const CAPTION_FADE_MS = 500;

type BuildOverlayVideoUrlArgs = {
  cloudName: string;
  publicId: string;
  // The first (or only, if no other cards/closing card are given) text
  // card.
  overlayText?: string | null;
  // Extra cards shown in sequence after overlayText, each getting its own
  // even slice of the clip's timeline — see the "multi-card" branch below.
  // Only takes effect when durationSeconds is known; with more than one
  // card and no known duration, only overlayText renders (same as before
  // this option existed).
  additionalTextCards?: (string | null | undefined)[];
  // A final card appended after every entry in additionalTextCards — see
  // lib/closingCardText.ts's buildClosingCardText(). Participates in the
  // same even time-slicing as the other cards, so it lands in the last
  // slice of the clip rather than the caption sitting over the whole thing.
  closingCardText?: string | null;
  // The uploaded clip's own length, in seconds — needed to evenly time-slice
  // more than one card across it. Captured from the Cloudinary upload
  // widget's own response (see CloudinaryVideoStudio.tsx) at upload time;
  // there's no other cheap way to know a clip's duration ahead of asking
  // Cloudinary to actually composite it.
  durationSeconds?: number | null;
  // Cloudinary public_id of the chosen background track (see
  // lib/musicLibrary.ts), or null/undefined for "no music".
  musicPublicId?: string | null;
  audioMode?: AudioMode;
  captionStyle?: CaptionStyle;
  captionPosition?: CaptionPosition;
  captionFont?: CaptionFont;
};

// One card's text layer (text + fade + position) — shared by both the
// single-card and multi-card branches of buildOverlayVideoUrl below so they
// can't drift on how a card actually renders. `visibleSeconds`, when given,
// is this card's own real on-screen length (the whole clip's length for the
// single-card case, or one slice's length for a multi-card segment) — see
// below for why it's required for the fade to actually apply at all, and
// also caps the fade duration to a fraction of it so a short slice/clip
// can't ask for a longer fade-in+fade-out than it has room for. Omitted
// entirely, NO fade is applied — safer than a fade that renders wrong (see
// below), and matches this feature's original, pre-fade behavior exactly
// (still relevant for an old post with no captured clip length at all).
//
// Two real Cloudinary quirks, both confirmed directly against the live API
// this session, drive this function's shape:
//
// 1. `so_`/`eo_` do NOT scope *when* a text overlay appears on the base
//    video's own timeline the way they do for a video overlay (the
//    documented, standard use of those params): a lone l_text layer with
//    so_/eo_ still rendered across the clip's ENTIRE length, so_/eo_ having
//    no effect on it at all. This was this feature's original (wrong)
//    approach to sequencing multiple cards, and exactly the bug an owner
//    test caught (all cards piled on top of each other). Fixed in
//    buildOverlayVideoUrl's multi-card branch below via the real,
//    confirmed-working technique instead: trim the clip into actual
//    separate segments and splice them together (`fl_splice`) — so_/eo_
//    DOES work to trim a video overlay/asset, which is what each spliced
//    segment is.
// 2. `e_fade` on a text layer needs an explicit `du_` (duration) telling it
//    how long the layer is actually visible for — without it, Cloudinary
//    silently collapses the overlay to a brief flash right at the very
//    start (confirmed: same broken flash whether or not so_/eo_ trimming
//    was also present), which is what made caption fade (added this
//    session, alongside the multi-card work) look identical to the so_/eo_
//    bug above at a glance — a second, independent bug hiding behind the
//    first one's symptom. `du_<visibleSeconds>` fixes it — confirmed the
//    text now stays visible for that entire window, fading only at the
//    real start/end.
function buildCardSegments(
  text: string,
  captionStyle: CaptionStyle,
  captionPosition: CaptionPosition,
  visibleSeconds?: number,
  captionFont: CaptionFont = "arial",
): string[] {
  // font + paddingPx: the video-only look requested by the owner (a chosen
  // font instead of always Arial, and extra breathing room around the text
  // — see CAPTION_FONTS/TEXT_PADDING_PX's own comments). No cornerRadius —
  // that's what removes the video caption's corner radius entirely; photo
  // captions (lib/cloudinaryImage.ts) still pass their own value directly,
  // unaffected.
  const base = buildTextLayerBase(text, captionStyle, {
    font: buildFontDescriptor(captionFont),
    paddingPx: TEXT_PADDING_PX,
  });
  if (visibleSeconds && visibleSeconds > 0) {
    const fadeMs = Math.min(CAPTION_FADE_MS, Math.round(visibleSeconds * 1000 * 0.3));
    return [
      base,
      `du_${visibleSeconds.toFixed(2)},e_fade:${fadeMs},e_fade:-${fadeMs}`,
      `fl_layer_apply,${CAPTION_POSITIONS[captionPosition]}`,
    ];
  }
  return [base, `fl_layer_apply,${CAPTION_POSITIONS[captionPosition]}`];
}

// Shared by buildOverlayVideoUrl (the real .mp4), buildCaptionFramePreviewUrl
// (the cheap still-frame stand-in used for live caption auditioning — see
// that function's own comment), and lib/cloudinaryImage.ts's
// buildOverlayImageUrl (the equivalent overlay for a News post's photo, not
// a video) — so all three can never drift apart on the actual text-layer
// transformation syntax or the caption-encoding fix above. Returns the
// `l_text:...` + `fl_layer_apply,...` segment pair, or an empty array when
// there's no caption text to render.
//
// `sizing` lets a caller override the font/width/corner-radius/padding that
// would otherwise default to this file's own TEXT_FONT_SIZE/TEXT_MAX_WIDTH
// constants (font defaults to "arial" via buildFontDescriptor) — those are
// tuned specifically for this feature's consistently-1080px-wide portrait
// video uploads (see TEXT_MAX_WIDTH's own comment), which doesn't hold for
// News photos (no consistent width at all). lib/cloudinaryImage.ts scales
// font size/width/corner-radius proportionally to each photo's own real
// width instead of reusing these literal pixel values, and doesn't pass
// `paddingPx` at all (that's video-only — see TEXT_PADDING_PX's own
// comment). `cornerRadius`/`paddingPx` are both genuinely optional with NO
// fallback default — omitted, neither the `r_` nor the `bo_` segment is
// added at all (this is what makes plain video captions have no corner
// radius: buildCardSegments below never passes one).
// The `l_text:...` component itself (color/bg/width/corner-radius/padding)
// with no timing/fade/positioning attached — factored out of
// buildTextLayerSegments so buildOverlayVideoUrl's multi-card sequencing
// below (which needs to attach a per-card so_/eo_/e_fade component that
// buildTextLayerSegments' other two callers — the frame-preview stand-in
// and lib/cloudinaryImage.ts's photo overlay — have no use for and
// shouldn't risk) can reuse the exact same color/box/wrap logic without
// duplicating it. Returns null when there's no text to render.
function buildTextLayerBase(
  text: string,
  captionStyle: CaptionStyle,
  sizing?: { font?: string; maxWidth?: number; cornerRadius?: number; paddingPx?: number },
): string {
  const { textColor, bgColor } = CAPTION_STYLES[captionStyle];
  const bgSegment = bgColor ? `,b_rgb:${bgColor}` : "";
  const font = sizing?.font ?? buildFontDescriptor("arial");
  const maxWidth = sizing?.maxWidth ?? TEXT_MAX_WIDTH;
  const cornerRadiusSegment = sizing?.cornerRadius ? `,r_${sizing.cornerRadius}` : "";
  // Only when there's a real background box to extend — see TEXT_PADDING_PX's
  // own comment for why a "-no-bg" style skips this.
  const paddingSegment = sizing?.paddingPx && bgColor ? `,bo_${sizing.paddingPx}px_solid_rgb:${bgColor}` : "";
  return `l_text:${font}:${encodeCaptionText(text)},co_${textColor}${bgSegment}${paddingSegment},w_${maxWidth},c_fit${cornerRadiusSegment}`;
}

export function buildTextLayerSegments(
  overlayText: string | null | undefined,
  captionStyle: CaptionStyle,
  captionPosition: CaptionPosition,
  sizing?: { font?: string; maxWidth?: number; cornerRadius?: number; paddingPx?: number },
): string[] {
  const trimmedText = overlayText?.trim();
  if (!trimmedText) return [];
  return [buildTextLayerBase(trimmedText, captionStyle, sizing), `fl_layer_apply,${CAPTION_POSITIONS[captionPosition]}`];
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
  additionalTextCards,
  closingCardText,
  durationSeconds,
  musicPublicId,
  audioMode = "replace",
  captionStyle = "white-on-black",
  captionPosition = "bottom",
  captionFont = "arial",
}: BuildOverlayVideoUrlArgs): string {
  const segments: string[] = [];

  const cards = [overlayText, ...(additionalTextCards ?? []), closingCardText]
    .map((text) => text?.trim())
    .filter((text): text is string => Boolean(text));
  // Only takes the real multi-card (splice) path when there's more than one
  // card AND the clip's own length is known — with more than one card but
  // no known duration (an old post from before durationSeconds was
  // captured), only the first card renders, same as this feature's
  // original single-caption behavior, rather than risk a splice with no
  // real slice lengths to compute.
  const isMultiCard = cards.length > 1 && Boolean(durationSeconds) && (durationSeconds as number) > 0;

  // Applied directly to the base video (not inside a layer): strip its own
  // audio track entirely ("replace"), or just turn it down so the music
  // sits on top of it instead of drowning it out ("mix"). Either way this
  // must come before the l_audio layer, since it targets the base asset's
  // own audio, not the added track. A plain function (not called
  // unconditionally below) because WHERE this needs to go differs between
  // the single-card and multi-card cases — see each branch below.
  function pushMusicSegments() {
    if (!musicPublicId) return;
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
    // No fade here, deliberately — this was attempted this session (an
    // `e_fade`/`e_fade:-` pair, same idea as the caption fade below) and
    // reverted after real-API testing showed it doesn't reliably work for
    // audio the way it does for text: fade-IN measured real (rising
    // volume), but fade-OUT never took effect at all — confirmed via
    // `volumedetect` on a real composited clip, mean volume stayed flat
    // right up to the very last frame regardless of an added `du_` (which
    // is what fixed the equivalent problem for text, see
    // buildCardSegments). Rather than ship a fade that's silently only
    // half-working, this reverted to MUSIC_FADE_MS's pre-fade baseline
    // (music plays straight through, cut off cleanly at the clip's end,
    // same as before this session) — worth real research before trying
    // again, not another guess. See CLAUDE.md's "What's next" for this.
    segments.push("fl_layer_apply");
  }

  // Single-card case: music goes first, exactly as this feature has always
  // done (proven correct — see CLAUDE.md item 28). The multi-card case
  // pushes it later instead — see that branch below for why.
  if (!isMultiCard) pushMusicSegments();

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
  //
  // Multiple cards (overlayText, additionalTextCards, closingCardText, in
  // that order) get evenly time-sliced across the clip's own length and
  // shown one at a time — the multi-"card" sequence this feature was
  // extended for (see CLAUDE.md). Built via real segment trimming + splicing
  // (`fl_splice`), NOT so_/eo_ on each text layer — see buildCardSegments'
  // own comment for why that first attempt didn't work. Each segment after
  // the first re-references this same clip's own publicId as its own
  // `l_video:` overlay purely so it can be independently so_/eo_-trimmed
  // (which DOES work at this level — it's the documented way to trim a
  // video overlay/asset) and captioned before `fl_splice` appends it onto
  // the growing result. Falls back to a single full-duration card (this
  // feature's original behavior, still exactly how most posts use it)
  // whenever there's only one card, or the clip's duration isn't known.
  if (isMultiCard) {
    const slice = (durationSeconds as number) / cards.length;
    const colonPublicId = publicId.replace(/\//g, ":");
    cards.forEach((text, i) => {
      const startSeconds = i * slice;
      const endSeconds = (i + 1) * slice;
      if (i > 0) segments.push(`fl_splice,l_video:${colonPublicId}`);
      segments.push(`so_${startSeconds.toFixed(2)},eo_${endSeconds.toFixed(2)}`);
      segments.push(...buildCardSegments(text, captionStyle, captionPosition, slice, captionFont));
      // Closes the l_video splice layer itself (distinct from
      // buildCardSegments' own fl_layer_apply just above, which only closes
      // the l_text layer nested inside it) — merges this now-captioned,
      // trimmed segment onto the growing spliced result. Only the first
      // segment skips this, since it isn't inside an l_video splice layer
      // at all — it's the base asset itself, just trimmed.
      if (i > 0) segments.push("fl_layer_apply");
    });

    // Music goes here, not in the single-card spot above — it needs to
    // land on the WHOLE spliced-together result, not just the first
    // segment. Each spliced-in segment re-references the clip's own
    // original publicId, which carries none of this music layer, so
    // applying it before splicing would only cover the first segment and
    // leave the rest with the clip's own original audio underneath.
    pushMusicSegments();
  } else if (cards.length >= 1) {
    // durationSeconds, when known, both fixes the fade (see
    // buildCardSegments' own comment on why du_ is required for it to work
    // at all) and matches it to the clip's real length; when it isn't known
    // (an old post from before durationSeconds was captured), no fade is
    // applied at all rather than one that would render wrong.
    segments.push(...buildCardSegments(cards[0], captionStyle, captionPosition, durationSeconds ?? undefined, captionFont));
  }

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
  captionFont?: CaptionFont;
};

// A cheap stand-in for buildOverlayVideoUrl's real .mp4, used so the owner
// can audition caption text/style/position live (on every debounced
// keystroke and every style/position click) without spending a real video
// transformation each time. Cloudinary will hand back a single still frame
// from an uploaded video if you request its public_id with an image
// extension instead of `.mp4` — a "video-to-image" derivative, confirmed
// viable here already (this exact URL shape was used to investigate corner-
// radius rendering earlier in this feature's history — see git history) —
// and a single-frame image render is far lighter for Cloudinary to generate
// than re-encoding the whole clip, so recomputing this on every keystroke is
// safe in a way recomputing the real video isn't. The real, actually-posted
// video always goes through buildOverlayVideoUrl, only when the owner
// explicitly asks for it (see CloudinaryVideoStudio.tsx's "Update preview"
// button).
//
// Second, unrelated caller: components/news/NewsListView.tsx uses this same
// still-frame trick as the /news list card's thumbnail for a post that has a
// Video Studio video but no featuredImage — passing `overlayText: undefined`
// there (buildTextLayerSegments returns no layer at all when there's no
// text) gets a plain frame with no caption baked in. Before this, such a
// post's list card rendered with no thumbnail at all — no `.menu-card-img`
// div, nothing to click into visually.
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
  captionFont = "arial",
}: BuildCaptionFramePreviewUrlArgs): string {
  const segments: string[] = [`so_${CAPTION_FRAME_OFFSET_SECONDS}`];
  // Same font/padding/no-radius sizing as the real video's own card
  // rendering (see buildCardSegments) — otherwise this cheap preview would
  // visually mismatch the real "Update preview" video it's standing in for.
  segments.push(
    ...buildTextLayerSegments(overlayText, captionStyle, captionPosition, {
      font: buildFontDescriptor(captionFont),
      paddingPx: TEXT_PADDING_PX,
    }),
  );
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
