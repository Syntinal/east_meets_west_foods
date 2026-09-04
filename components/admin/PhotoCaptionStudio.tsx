"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useConfig, useField, usePayloadAPI, Button } from "@payloadcms/ui";
import { buildOverlayImageUrl, type FeaturedImageRef } from "@/lib/cloudinaryImage";
import type { CaptionStyle, CaptionPosition } from "@/lib/cloudinaryVideo";

// The preview + "Update preview" confirm step for News's photoCaption group
// (see collections/News.ts). Unlike CloudinaryVideoStudio.tsx, this doesn't
// own the caption text/style/position fields themselves — those are plain,
// visible, native Payload fields (a photo caption needs no upload widget or
// music-track picker the way a raw video clip does, so there's no reason to
// hide them behind a custom component the way the video fields are). This
// component only reads them (via useField) to render a live preview, and
// writes the 4 hidden confirmedX fields when "Update preview" is clicked.
//
// Only one preview tier, not two like the Video Studio's frame-preview/
// real-video split — compositing text onto a still photo (via Cloudinary's
// `image/fetch`, see lib/cloudinaryImage.ts) is already in the same cheap
// cost tier as that file's own frame-preview tier, so it's safe to recompute
// on every debounced keystroke right here. The "confirmed" gate below still
// exists, though — it's not about this component's own preview cost, it's
// about Payload's Live Preview panel (a separate browser context, synced on
// every keystroke with no debounce of its own) not recomputing a fresh
// Cloudinary transformation on every character the owner types elsewhere in
// the form. See collections/News.ts's confirmedX field comments and
// components/news/LiveNewsPost.tsx, the only reader of those fields.
//
// Reading the actual chosen photo's url/width needs a real fetch —
// Payload's own form state for a plain (non-polymorphic) upload field only
// ever holds the related document's id, not its populated url/width
// (confirmed by reading @payloadcms/ui's Upload field source) — so this
// looks the id up via usePayloadAPI, the same documented hook Payload's own
// admin UI uses for this kind of on-demand fetch.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

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
const warningStyle: CSSProperties = { ...helpStyle, color: "var(--theme-warning-500, #f5a623)" };

// Same debounce idiom as CloudinaryVideoStudio.tsx's useDebouncedValue — see
// this file's header comment for why a debounce is still worth having even
// though this preview tier is cheap: typing a caption character-by-character
// would otherwise recompute (and Cloudinary would regenerate) a distinct
// image derivative per keystroke instead of once per short pause.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
const CAPTION_DEBOUNCE_MS = 400;

export function PhotoCaptionStudio() {
  const { config } = useConfig();
  const featuredImageId = useField<string | number>({ path: "featuredImage" }).value;

  const [{ data: imageDoc }] = usePayloadAPI(
    featuredImageId ? `${config.serverURL}${config.routes.api}/media/${featuredImageId}` : "",
    {},
  );
  const image: FeaturedImageRef = imageDoc?.id
    ? { url: imageDoc.url as string, alt: imageDoc.alt as string | null, width: imageDoc.width as number | null }
    : null;

  const text = useField<string>({ path: "photoCaption.text" });
  const captionStyle = useField<string>({ path: "photoCaption.captionStyle" });
  const captionPosition = useField<string>({ path: "photoCaption.captionPosition" });

  const confirmedImageId = useField<string>({ path: "photoCaption.confirmedImageId" });
  const confirmedText = useField<string>({ path: "photoCaption.confirmedText" });
  const confirmedCaptionStyle = useField<string>({ path: "photoCaption.confirmedCaptionStyle" });
  const confirmedCaptionPosition = useField<string>({ path: "photoCaption.confirmedCaptionPosition" });

  const debouncedText = useDebouncedValue(text.value, CAPTION_DEBOUNCE_MS);

  const previewUrl = useMemo(() => {
    if (!CLOUD_NAME || !image?.url || !debouncedText?.trim()) return null;
    return buildOverlayImageUrl({
      cloudName: CLOUD_NAME,
      imageUrl: image.url,
      imageWidth: image.width,
      overlayText: debouncedText,
      captionStyle: (captionStyle.value as CaptionStyle) || "white-on-black",
      captionPosition: (captionPosition.value as CaptionPosition) || "bottom",
    });
  }, [image?.url, image?.width, debouncedText, captionStyle.value, captionPosition.value]);

  const isConfirmedForCurrentImage =
    Boolean(confirmedImageId.value) && confirmedImageId.value === String(featuredImageId ?? "");
  const isPreviewStale =
    isConfirmedForCurrentImage &&
    ((text.value ?? "") !== (confirmedText.value ?? "") ||
      (captionStyle.value || "white-on-black") !== (confirmedCaptionStyle.value || "white-on-black") ||
      (captionPosition.value || "bottom") !== (confirmedCaptionPosition.value || "bottom"));

  function updatePreview() {
    if (!featuredImageId) return;
    confirmedImageId.setValue(String(featuredImageId));
    confirmedText.setValue(text.value ?? "");
    confirmedCaptionStyle.setValue(captionStyle.value || "white-on-black");
    confirmedCaptionPosition.setValue(captionPosition.value || "bottom");
  }

  if (!CLOUD_NAME) {
    return (
      <div style={panelStyle}>
        <p style={helpStyle}>
          Cloudinary isn&rsquo;t configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is unset) — the preview can&rsquo;t run
          until that&rsquo;s set. The caption text will still be used wherever this photo is shown once it is.
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {previewUrl ? (
        <div style={rowStyle}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Text preview</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- a Cloudinary-hosted preview image, not a local/optimizable asset */}
          <img
            key={previewUrl}
            src={previewUrl}
            alt="Preview of the caption text on the photo"
            style={{ maxWidth: 360, borderRadius: 4 }}
          />
          <p style={helpStyle}>Updates automatically as you type.</p>
        </div>
      ) : (
        <p style={helpStyle}>
          {image?.url ? "Type caption text above to see a preview." : "Choose a photo above first."}
        </p>
      )}

      <div style={rowStyle}>
        <Button
          buttonStyle="secondary"
          margin={false}
          extraButtonProps={{ style: { alignSelf: "flex-start" } }}
          onClick={updatePreview}
        >
          Update preview
        </Button>
        <p style={helpStyle}>
          The preview above updates as you type for free — this button is what actually confirms it for the Live
          Preview panel, the post page, the News list, and social media.
        </p>
      </div>

      {isPreviewStale && (
        <p style={warningStyle}>
          You&rsquo;ve changed something since this was confirmed — click &ldquo;Update preview&rdquo; again to
          update it everywhere else.
        </p>
      )}
    </div>
  );
}
