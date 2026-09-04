"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useField, useFormFields, Button, CheckboxInput, SelectInput, TextInput } from "@payloadcms/ui";
import { CldUploadWidget } from "next-cloudinary";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import {
  buildOverlayVideoUrl,
  buildCaptionFramePreviewUrl,
  buildMusicPreviewUrl,
  MUSIC_PREVIEW_SECONDS,
  type AudioMode,
  type CaptionStyle,
  type CaptionPosition,
  type CaptionFont,
} from "@/lib/cloudinaryVideo";
import { buildClosingCardText } from "@/lib/closingCardText";
import { truncateWords } from "@/lib/newsText";

// The whole "Video Studio" wizard, as one self-contained component rather
// than several scattered fields — the owner asked for something simple to
// walk through, not a form full of independent controls. Owns 4 real
// (but `admin.hidden`) sibling fields under News's `cloudinaryVideo` group
// (see collections/News.ts): publicId, overlayText, musicTrackId,
// audioMode. Reads/writes each directly via useField(), the same "custom
// component drives sibling form state" idiom SocialPostStatusNotice.tsx
// already uses in read-only form (via useFormFields) — this just also
// writes.
//
// The text input, every dropdown, and every button below render via
// Payload's own TextInput/SelectInput/Button (all three genuinely exported
// from @payloadcms/ui, confirmed via its exports/client/index.d.ts) rather
// than plain HTML <input>/<select>/<button> elements — this is a deliberate
// choice for pixel-exact consistency with the rest of the admin (labels,
// description text, focus/error states, button padding/sizing, all of it)
// instead of a hand-approximated CSS copy that could drift the moment
// Payload's own styling changes (a real, not hypothetical, risk here — an
// earlier version of this file used plain `<button className="btn
// btn--style-secondary">` and was missing the `btn--size-medium` class
// Payload's real Button always adds, which is what actually supplies that
// button style's padding; every one of Button.tsx's own generated classes
// is read straight from its scss (node_modules/@payloadcms/ui/dist/
// elements/Button/index.scss), not guessed). TextInput/SelectInput are
// presentational/controlled components (take `value`/`onChange` directly,
// don't subscribe to Payload's form state via their own `path` the way a
// real registered field does), so feeding them this component's own
// useField() state works with no double-binding. Their `path`/`name` props
// are given distinct "videoStudio.*" strings, not the real
// "cloudinaryVideo.*" paths the 4 real (hidden) fields already use, purely
// to rule out any chance of a duplicate DOM id between this presentational
// copy and Payload's own hidden field markup for the same path.
//
// SelectInput's onChange fires with the selected Option object (react-
// select's own shape), not a plain string the way a native <select>'s
// onChange would — selectValue() below extracts the plain string this
// component actually stores.
//
// Two separate preview tiers, deliberately — Cloudinary's free tier draws
// storage/bandwidth/transformations from one shared 25-credit/month pool
// (see MAX_VIDEO_FILE_SIZE's own comment), and a non-technical owner
// clicking through caption styles or typing out a caption sentence
// shouldn't be able to burn through that pool by accident just from
// looking:
//   1. A live "frame preview" (buildCaptionFramePreviewUrl, a plain image —
//      one still frame with the same text overlay applied) recomputes on
//      every debounced keystroke and every style/position click. An image
//      render is far cheaper than a video one, so this tier is safe to
//      recompute freely.
//   2. The real composited video (buildOverlayVideoUrl, what the post page
//      and social-poster actually use) is only ever generated when the
//      owner clicks "Update preview" — never live off a keystroke or
//      dropdown. See updateVideoPreview()/videoPreview below.
// Cloudinary composites/CDN-caches each on its own first request; there's
// no separate render/queue step for either tier.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// A generous but real ceiling, not just "unlimited" — Cloudinary's free
// tier draws storage/bandwidth/transformations from one shared 25-credit/
// month pool, so an unbounded upload size here would make it too easy to
// blow through that pool with one long clip.
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const panelStyle: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  padding: 16,
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const rowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const helpStyle: CSSProperties = { fontSize: 12, color: "var(--theme-elevation-500)", margin: 0 };
// A row-flow sibling of rowStyle, scoped to just the Upload/Replace + Remove
// video buttons — puts them on the same horizontal plane instead of
// rowStyle's own column stack (which everything else in this file uses for
// label-above-field groups; not touched here, so those are unaffected).
const videoButtonRowStyle: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center", gap: 8 };
// Payload's own "size-medium" Button class (see the header comment's note on
// btn--size-medium) sets top/bottom padding to `calc(var(--base) * 0.2)` —
// trimmed by a further 3px here on both sides via the same --base variable
// Payload's own scss uses, rather than a guessed absolute px value, so this
// stays correct if the admin's base size (--base-px/--base-body-size in
// @payloadcms/ui's app.scss) ever changes. `border: "none"` overrides both
// the resting and hover border (an inline style wins the cascade over any
// selector-based rule, :hover included), removing "secondary"/"subtle"'s
// border outline entirely for just these two buttons.
const compactVideoButtonStyle: CSSProperties = {
  alignSelf: "flex-start",
  paddingTop: "calc(var(--base) * 0.2 - 3px)",
  paddingBottom: "calc(var(--base) * 0.2 - 3px)",
  border: "none",
};

const CAPTION_STYLE_OPTIONS = [
  { label: "White text, black background", value: "white-on-black" },
  { label: "Black text, white background", value: "black-on-white" },
  { label: "White text, red background", value: "white-on-red" },
  { label: "White text, no background", value: "white-no-bg" },
  { label: "Black text, no background", value: "black-no-bg" },
];

const CAPTION_POSITION_OPTIONS = [
  { label: "Top", value: "top" },
  { label: "Center", value: "center" },
  { label: "Bottom", value: "bottom" },
];

const AUDIO_MODE_OPTIONS = [
  { label: "Replace with the music track", value: "replace" },
  { label: "Keep it, mixed in under the music", value: "mix" },
];

// Keep in sync with lib/cloudinaryVideo.ts's CAPTION_FONTS.
const CAPTION_FONT_OPTIONS = [
  { label: "Arial (plain)", value: "arial" },
  { label: "Montserrat", value: "montserrat" },
  { label: "Poppins", value: "poppins" },
  { label: "Anton", value: "anton" },
  { label: "Oswald", value: "oswald" },
];

// Extracts the plain string this component stores from SelectInput's
// onChange payload (an Option object, or an array of them for a multi-
// select — none of these are multi-selects, but the type allows it).
function selectValue(option: unknown): string {
  const opt = Array.isArray(option) ? option[0] : option;
  return opt && typeof opt === "object" && "value" in opt ? String((opt as { value: unknown }).value) : "";
}

// Delays feeding fast-changing input (specifically, the caption text field)
// into a Cloudinary-URL-driving useMemo — without this, typing a caption
// character-by-character would recompute (and Cloudinary would regenerate)
// a distinct still frame per keystroke instead of once per short pause.
// Dropdown selections (music/style/position) aren't debounced — they're
// discrete clicks, already naturally rate-limited by how fast a person can
// click, so there's no keystroke-storm equivalent to guard against there.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// How long to wait after the last keystroke in the caption field before
// recomputing the frame preview. Short enough to still feel live, long
// enough that a normal typing cadence only fires once per pause, not once
// per character.
const CAPTION_DEBOUNCE_MS = 400;

export function CloudinaryVideoStudio() {
  // `title` no longer exists as an owner-facing field (see
  // collections/News.ts's `message` field) — this prefill now comes from
  // the post's own message, shortened to something caption-length, still
  // the same "one-time convenience, editable" idea as before.
  const message = useFormFields(([fields]) => fields.message?.value as string | undefined);
  const suggestedCaption = message ? truncateWords(message, 60) : undefined;

  const publicId = useField<string>({ path: "cloudinaryVideo.publicId" });
  const overlayText = useField<string>({ path: "cloudinaryVideo.overlayText" });
  // Up to 2 more cards shown in sequence after overlayText — see
  // lib/cloudinaryVideo.ts's buildOverlayVideoUrl. durationSeconds is
  // captured from the upload widget's own response, not owner-entered (see
  // the CldUploadWidget onSuccess handler below) — needed to evenly
  // time-slice more than one card across the clip.
  const textCard2 = useField<string>({ path: "cloudinaryVideo.textCard2" });
  const textCard3 = useField<string>({ path: "cloudinaryVideo.textCard3" });
  const durationSeconds = useField<number>({ path: "cloudinaryVideo.durationSeconds" });
  const addClosingCard = useField<boolean>({ path: "cloudinaryVideo.addClosingCard" });
  const musicTrackId = useField<string>({ path: "cloudinaryVideo.musicTrackId" });
  const audioMode = useField<string>({ path: "cloudinaryVideo.audioMode" });
  const captionStyle = useField<string>({ path: "cloudinaryVideo.captionStyle" });
  const captionPosition = useField<string>({ path: "cloudinaryVideo.captionPosition" });
  const captionFont = useField<string>({ path: "cloudinaryVideo.captionFont" });

  // The "last confirmed" shadow copies of the fields above — real,
  // persisted document fields (see collections/News.ts's own comment on
  // them for the full reasoning), written only by updateVideoPreview()
  // below. Reading them via useField() the same way as the live fields
  // means this component's own Tier-2 preview and
  // components/news/LiveNewsPost.tsx's Live Preview panel both end up
  // reading the literal same source of truth — just from two different
  // contexts (this component's form state here, the synced document
  // there).
  const confirmedPublicId = useField<string>({ path: "cloudinaryVideo.confirmedPublicId" });
  const confirmedOverlayText = useField<string>({ path: "cloudinaryVideo.confirmedOverlayText" });
  const confirmedTextCard2 = useField<string>({ path: "cloudinaryVideo.confirmedTextCard2" });
  const confirmedTextCard3 = useField<string>({ path: "cloudinaryVideo.confirmedTextCard3" });
  const confirmedDurationSeconds = useField<number>({ path: "cloudinaryVideo.confirmedDurationSeconds" });
  const confirmedAddClosingCard = useField<boolean>({ path: "cloudinaryVideo.confirmedAddClosingCard" });
  const confirmedMusicTrackId = useField<string>({ path: "cloudinaryVideo.confirmedMusicTrackId" });
  const confirmedAudioMode = useField<string>({ path: "cloudinaryVideo.confirmedAudioMode" });
  const confirmedCaptionStyle = useField<string>({ path: "cloudinaryVideo.confirmedCaptionStyle" });
  const confirmedCaptionPosition = useField<string>({ path: "cloudinaryVideo.confirmedCaptionPosition" });
  const confirmedCaptionFont = useField<string>({ path: "cloudinaryVideo.confirmedCaptionFont" });

  const musicOptions = useMemo(
    () => [{ label: "No music", value: "none" }, ...MUSIC_LIBRARY.map((track) => ({ label: track.label, value: track.id }))],
    []
  );

  const selectedTrack = MUSIC_LIBRARY.find((track) => track.id === musicTrackId.value);
  const hasMusic = Boolean(selectedTrack);

  // Lets the owner listen to a track before committing to it — pick one
  // from the dropdown, then click Preview. A real button click (rather
  // than auto-playing on selection) sidesteps browsers' autoplay-with-
  // sound restrictions entirely, and doubles as the "toggle" to stop it.
  // Trimmed to the track's own first MUSIC_PREVIEW_SECONDS (see
  // lib/cloudinaryVideo.ts's buildMusicPreviewUrl) — the same portion
  // that'll actually play if the track is longer than the clip it's added
  // to (tracks get trimmed to the video's length, never the reverse; see
  // CLAUDE.md item 28), so previewing the beginning is previewing the
  // real outcome, not just a cheaper sample.
  const musicPreviewUrl =
    selectedTrack && CLOUD_NAME
      ? buildMusicPreviewUrl({ cloudName: CLOUD_NAME, publicId: selectedTrack.publicId })
      : null;
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Switching tracks while a preview is playing would otherwise keep the
  // *previous* track's audio going under the *new* selection — stop it so
  // there's never a mismatch between what's selected and what's audible.
  useEffect(() => {
    previewAudioRef.current?.pause();
    setIsPreviewPlaying(false);
  }, [musicTrackId.value]);

  function togglePreview() {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
    } else {
      audio.currentTime = 0;
      void audio.play();
    }
  }

  // Tier 1 — cheap, live, image-only. Recomputes on every debounced
  // keystroke and every style/position click; never touches the real video
  // pipeline. See this file's header comment for why this is split from
  // the real video preview below.
  const debouncedOverlayText = useDebouncedValue(overlayText.value, CAPTION_DEBOUNCE_MS);
  const framePreviewUrl = useMemo(() => {
    if (!CLOUD_NAME || !publicId.value) return null;
    return buildCaptionFramePreviewUrl({
      cloudName: CLOUD_NAME,
      publicId: publicId.value,
      overlayText: debouncedOverlayText,
      captionStyle: (captionStyle.value as CaptionStyle) || "white-on-black",
      captionPosition: (captionPosition.value as CaptionPosition) || "bottom",
      captionFont: (captionFont.value as CaptionFont) || "arial",
    });
  }, [publicId.value, debouncedOverlayText, captionStyle.value, captionPosition.value, captionFont.value]);

  // Tier 2 — the real composited video. Built ONLY from the confirmed
  // shadow fields, never the live ones above — those only change when
  // updateVideoPreview() writes them (i.e. when "Update preview" is
  // clicked), so a useMemo keyed on them is safe in a way keying it on the
  // live fields directly wouldn't be (that was this file's original bug —
  // see CLAUDE.md's "Live Preview gap" note). `isConfirmedForCurrentVideo`
  // guards against showing a leftover confirmed preview from a video
  // that's since been replaced or removed — confirmedPublicId no longer
  // matching the current publicId is exactly that case, and needs no
  // separate clearing step on Remove/Replace to detect.
  const isConfirmedForCurrentVideo = Boolean(confirmedPublicId.value) && confirmedPublicId.value === publicId.value;

  const confirmedVideoUrl = useMemo(() => {
    if (!CLOUD_NAME || !isConfirmedForCurrentVideo) return null;
    return buildOverlayVideoUrl({
      cloudName: CLOUD_NAME,
      publicId: confirmedPublicId.value,
      overlayText: confirmedOverlayText.value,
      additionalTextCards: [confirmedTextCard2.value, confirmedTextCard3.value],
      closingCardText: confirmedAddClosingCard.value ? buildClosingCardText() : null,
      durationSeconds: confirmedDurationSeconds.value,
      musicPublicId: MUSIC_LIBRARY.find((track) => track.id === confirmedMusicTrackId.value)?.publicId ?? null,
      audioMode: (confirmedAudioMode.value as AudioMode) || "replace",
      captionStyle: (confirmedCaptionStyle.value as CaptionStyle) || "white-on-black",
      captionPosition: (confirmedCaptionPosition.value as CaptionPosition) || "bottom",
      captionFont: (confirmedCaptionFont.value as CaptionFont) || "arial",
    });
  }, [
    isConfirmedForCurrentVideo,
    confirmedPublicId.value,
    confirmedOverlayText.value,
    confirmedTextCard2.value,
    confirmedTextCard3.value,
    confirmedAddClosingCard.value,
    confirmedDurationSeconds.value,
    confirmedMusicTrackId.value,
    confirmedAudioMode.value,
    confirmedCaptionStyle.value,
    confirmedCaptionPosition.value,
    confirmedCaptionFont.value,
  ]);

  function updateVideoPreview() {
    if (!CLOUD_NAME || !publicId.value) return;
    confirmedPublicId.setValue(publicId.value);
    confirmedOverlayText.setValue(overlayText.value ?? "");
    confirmedTextCard2.setValue(textCard2.value ?? "");
    confirmedTextCard3.setValue(textCard3.value ?? "");
    confirmedAddClosingCard.setValue(Boolean(addClosingCard.value));
    confirmedDurationSeconds.setValue(durationSeconds.value);
    confirmedMusicTrackId.setValue(musicTrackId.value ?? "none");
    confirmedAudioMode.setValue(audioMode.value || "replace");
    confirmedCaptionStyle.setValue(captionStyle.value || "white-on-black");
    confirmedCaptionPosition.setValue(captionPosition.value || "bottom");
    confirmedCaptionFont.setValue(captionFont.value || "arial");
  }

  // True once anything the real video depends on has changed since the
  // last "Update preview" click — drives the "out of date" note so the
  // owner doesn't mistake the still-showing confirmed video for one that
  // already reflects their latest edits. Only meaningful once something's
  // actually been confirmed for this exact video.
  const isPreviewStale =
    isConfirmedForCurrentVideo &&
    ((overlayText.value ?? "") !== (confirmedOverlayText.value ?? "") ||
      (textCard2.value ?? "") !== (confirmedTextCard2.value ?? "") ||
      (textCard3.value ?? "") !== (confirmedTextCard3.value ?? "") ||
      Boolean(addClosingCard.value) !== Boolean(confirmedAddClosingCard.value) ||
      (musicTrackId.value || "none") !== (confirmedMusicTrackId.value || "none") ||
      (audioMode.value || "replace") !== (confirmedAudioMode.value || "replace") ||
      (captionStyle.value || "white-on-black") !== (confirmedCaptionStyle.value || "white-on-black") ||
      (captionPosition.value || "bottom") !== (confirmedCaptionPosition.value || "bottom") ||
      (captionFont.value || "arial") !== (confirmedCaptionFont.value || "arial"));

  if (!CLOUD_NAME) {
    return (
      <div style={panelStyle}>
        <p style={helpStyle}>
          Cloudinary isn&rsquo;t configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is unset) — the Video Studio can&rsquo;t
          run until that&rsquo;s set.
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={videoButtonRowStyle}>
        <CldUploadWidget
          signatureEndpoint="/api/cloudinary/sign"
          options={{
            resourceType: "video",
            sources: ["local"],
            multiple: false,
            folder: "news-videos",
            maxVideoFileSize: MAX_VIDEO_FILE_SIZE,
          }}
          onSuccess={(results) => {
            const info = results.info;
            if (!info || typeof info !== "object" || !info.public_id) return;
            publicId.setValue(info.public_id);
            // Cloudinary's upload response includes the clip's own length
            // for a video resource — needed to evenly time-slice more than
            // one text card across it (see buildOverlayVideoUrl). Not
            // owner-facing; nothing to fall back to if it's missing other
            // than the existing single-full-duration-card behavior.
            if (typeof info.duration === "number") durationSeconds.setValue(info.duration);
            // One-time convenience prefill, not a live sync — only fills it
            // in the first time a video is uploaded and no caption has been
            // typed yet; the owner can change or clear it from there.
            if (!overlayText.value && suggestedCaption) overlayText.setValue(suggestedCaption);
          }}
        >
          {({ open }) => (
            // compactVideoButtonStyle (via extraButtonProps, since Button
            // has no direct `style` prop — see index.d.ts's Props type)
            // keeps the button sized to its own content rather than
            // stretching to fill videoButtonRowStyle's row, trims its
            // padding, and drops its border. Matches "Remove video" just
            // below.
            // buttonStyle: "secondary" only for the real Step-1 call to
            // action (no video attached yet); once a video exists, this
            // same button relabels to "Replace video" and downplays to
            // "subtle" alongside "Remove video" below — both are now
            // secondary actions relative to the video that's already
            // there, not the main thing to do. "secondary" carries a full
            // dark border with the same text-color weight as "primary",
            // which read as equally prominent as the wizard's own Back/
            // Next controls; "subtle" is a real, muted Payload style
            // (grey bg/border, node_modules/@payloadcms/ui/dist/elements/
            // Button/index.scss's `--style-subtle` block), not a
            // hand-approximated one.
            <Button
              buttonStyle={publicId.value ? "subtle" : "secondary"}
              margin={false}
              extraButtonProps={{ style: compactVideoButtonStyle }}
              onClick={() => open()}
            >
              {publicId.value ? "Replace video" : "Upload video"}
            </Button>
          )}
        </CldUploadWidget>
        {publicId.value && (
          <Button
            buttonStyle="subtle"
            margin={false}
            extraButtonProps={{ style: compactVideoButtonStyle }}
            onClick={() => {
              publicId.setValue("");
              overlayText.setValue("");
              textCard2.setValue("");
              textCard3.setValue("");
              durationSeconds.setValue(undefined);
              addClosingCard.setValue(false);
              musicTrackId.setValue("none");
              audioMode.setValue("replace");
              captionStyle.setValue("white-on-black");
              captionPosition.setValue("bottom");
              captionFont.setValue("arial");
            }}
          >
            Remove video
          </Button>
        )}
      </div>

      {publicId.value && (
        <>
          <TextInput
            path="videoStudio.overlayText"
            label="Text on the video (optional)"
            description="Short text shown right on the video itself — different from the post you write in Step 2, which is the caption that goes with it."
            value={overlayText.value ?? ""}
            // hasMany: false picks the plain-<input> branch of
            // TextInputProps' onChange union (see components/admin/
            // CloudinaryVideoStudio.tsx's header comment) — without it, TS
            // can't narrow which of the two onChange shapes applies.
            hasMany={false}
            onChange={(e) => overlayText.setValue(e.target.value)}
            placeholder={suggestedCaption || "Leave blank for no on-screen text"}
          />

          {/* Up to 2 more cards, shown one at a time in sequence after the
              text above — each gated on the previous one actually having
              text, so the owner isn't shown 3 empty boxes at once. All
              cards share the one caption style/position choice below;
              adding a per-card style would be more to explain for little
              real benefit. */}
          {overlayText.value?.trim() && (
            <TextInput
              path="videoStudio.textCard2"
              label="Second text card (optional)"
              description="Shown right after the text above, like a second slide — e.g. “Starting Sept 1st” after “NEW: Happy Hour”."
              value={textCard2.value ?? ""}
              hasMany={false}
              onChange={(e) => textCard2.setValue(e.target.value)}
              placeholder="Leave blank for just one card"
            />
          )}
          {overlayText.value?.trim() && textCard2.value?.trim() && (
            <TextInput
              path="videoStudio.textCard3"
              label="Third text card (optional)"
              value={textCard3.value ?? ""}
              hasMany={false}
              onChange={(e) => textCard3.setValue(e.target.value)}
              placeholder="Leave blank for just two cards"
            />
          )}

          {overlayText.value?.trim() && (
            <>
              <SelectInput
                path="videoStudio.captionStyle"
                name="videoStudio.captionStyle"
                label="Caption style"
                options={CAPTION_STYLE_OPTIONS}
                value={captionStyle.value || "white-on-black"}
                onChange={(option) => captionStyle.setValue(selectValue(option))}
              />

              <SelectInput
                path="videoStudio.captionPosition"
                name="videoStudio.captionPosition"
                label="Caption position"
                options={CAPTION_POSITION_OPTIONS}
                value={captionPosition.value || "bottom"}
                onChange={(option) => captionPosition.setValue(selectValue(option))}
              />

              <SelectInput
                path="videoStudio.captionFont"
                name="videoStudio.captionFont"
                label="Caption font"
                options={CAPTION_FONT_OPTIONS}
                value={captionFont.value || "arial"}
                onChange={(option) => captionFont.setValue(selectValue(option))}
              />

              {framePreviewUrl && (
                <div style={rowStyle}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Text preview</span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a Cloudinary-hosted preview image, not a local/optimizable asset */}
                  <img
                    key={framePreviewUrl}
                    src={framePreviewUrl}
                    alt="Preview of the caption text on one frame of the video"
                    style={{ maxWidth: 360, borderRadius: 4 }}
                  />
                  <p style={helpStyle}>
                    A quick, free look at how the text sits on one frame — not the finished video. Use
                    &ldquo;Update preview&rdquo; below once you&rsquo;re happy with it.
                  </p>
                </div>
              )}
            </>
          )}

          <div style={rowStyle}>
            <SelectInput
              path="videoStudio.musicTrackId"
              name="videoStudio.musicTrackId"
              label="Background music"
              options={musicOptions}
              value={musicTrackId.value ?? "none"}
              onChange={(option) => musicTrackId.setValue(selectValue(option))}
            />
            {MUSIC_LIBRARY.length === 0 && (
              <p style={helpStyle}>No tracks in the library yet — this post will use its own audio as-is.</p>
            )}
            {hasMusic && musicPreviewUrl && (
              // No marginTop here — the parent rowStyle's own `gap: 4` already
              // spaces every direct child consistently.
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* margin={false} — Payload's Button applies a ~24px top+
                    bottom margin-block by default (see node_modules/
                    @payloadcms/ui/dist/elements/Button/index.scss); this
                    button sits directly under a tightly-spaced dropdown,
                    unlike the Upload/Replace video buttons above. Already
                    sized correctly by this row's own flex-row + alignItems:
                    center, so no extraButtonProps alignSelf override
                    needed here (unlike the column-flow rowStyle buttons). */}
                <Button buttonStyle="secondary" margin={false} onClick={togglePreview}>
                  {isPreviewPlaying ? "⏸ Stop preview" : `▶ Preview (first ${MUSIC_PREVIEW_SECONDS}s)`}
                </Button>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a short audio-only preview, not public-facing content */}
                <audio
                  ref={previewAudioRef}
                  src={musicPreviewUrl}
                  preload="none"
                  onPlay={() => setIsPreviewPlaying(true)}
                  onPause={() => setIsPreviewPlaying(false)}
                  onEnded={() => setIsPreviewPlaying(false)}
                />
              </div>
            )}
          </div>

          {hasMusic && (
            <SelectInput
              path="videoStudio.audioMode"
              name="videoStudio.audioMode"
              label="Original audio"
              options={AUDIO_MODE_OPTIONS}
              value={audioMode.value || "replace"}
              onChange={(option) => audioMode.setValue(selectValue(option))}
            />
          )}

          <div style={rowStyle}>
            <CheckboxInput
              id="videoStudio.addClosingCard"
              label="Add a closing card with our name & website"
              checked={Boolean(addClosingCard.value)}
              onToggle={(e) => addClosingCard.setValue(e.target.checked)}
            />
            <p style={helpStyle}>
              Adds one more card at the very end with our name and website — a nice way to close out a promo video.
            </p>
          </div>

          <div style={rowStyle}>
            {/* Always "Update preview", never "Generate preview" the first
                time — a single constant label, so it can never mismatch the
                fixed "Update preview" wording used elsewhere (the frame-
                preview helper text below, and the stale-preview notice) the
                way an earlier version of this button did. */}
            <Button
              buttonStyle="secondary"
              margin={false}
              extraButtonProps={{ style: { alignSelf: "flex-start" } }}
              onClick={updateVideoPreview}
            >
              Update preview
            </Button>
            <p style={helpStyle}>
              This is the only step that renders the real video — everything above (text, styles, music) is free to
              try out as much as you want first. This is also what shows up in the Live Preview panel, so trying
              things there without clicking this first won&rsquo;t generate anything new either.
            </p>
          </div>

          {isConfirmedForCurrentVideo && confirmedVideoUrl && (
            <div style={rowStyle}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Preview</span>
              {isPreviewStale && (
                <p style={{ ...helpStyle, color: "var(--theme-warning-500, #f5a623)" }}>
                  You&rsquo;ve changed something since this preview was made — click &ldquo;Update preview&rdquo;
                  above to see the latest version.
                </p>
              )}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- admin-only preview, not public-facing */}
              <video
                key={confirmedVideoUrl}
                src={confirmedVideoUrl}
                controls
                playsInline
                preload="none"
                style={{ maxWidth: 360, borderRadius: 4 }}
              />
              <p style={helpStyle}>
                The very first play may take a few seconds while Cloudinary generates this version — it&rsquo;s cached
                after that.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
