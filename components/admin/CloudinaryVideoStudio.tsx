"use client";

import { useMemo, type CSSProperties } from "react";
import { useField, useFormFields } from "@payloadcms/ui";
import { CldUploadWidget } from "next-cloudinary";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import { buildOverlayVideoUrl, type AudioMode, type CaptionStyle, type CaptionPosition } from "@/lib/cloudinaryVideo";

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
// No render/queue step: the preview below is just the same
// buildOverlayVideoUrl() the real post page and social-poster use,
// recomputed on every change. Cloudinary composites it on first request.

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
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 600 };
const helpStyle: CSSProperties = { fontSize: 12, color: "var(--theme-elevation-500)", margin: 0 };

export function CloudinaryVideoStudio() {
  const title = useFormFields(([fields]) => fields.title?.value as string | undefined);

  const publicId = useField<string>({ path: "cloudinaryVideo.publicId" });
  const overlayText = useField<string>({ path: "cloudinaryVideo.overlayText" });
  const musicTrackId = useField<string>({ path: "cloudinaryVideo.musicTrackId" });
  const audioMode = useField<string>({ path: "cloudinaryVideo.audioMode" });
  const captionStyle = useField<string>({ path: "cloudinaryVideo.captionStyle" });
  const captionPosition = useField<string>({ path: "cloudinaryVideo.captionPosition" });

  const selectedTrack = MUSIC_LIBRARY.find((track) => track.id === musicTrackId.value);
  const hasMusic = Boolean(selectedTrack);

  const previewUrl = useMemo(() => {
    if (!CLOUD_NAME || !publicId.value) return null;
    return buildOverlayVideoUrl({
      cloudName: CLOUD_NAME,
      publicId: publicId.value,
      overlayText: overlayText.value,
      musicPublicId: selectedTrack?.publicId ?? null,
      audioMode: (audioMode.value as AudioMode) || "replace",
      captionStyle: (captionStyle.value as CaptionStyle) || "white-on-black",
      captionPosition: (captionPosition.value as CaptionPosition) || "bottom",
    });
  }, [publicId.value, overlayText.value, selectedTrack, audioMode.value, captionStyle.value, captionPosition.value]);

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
      <div style={rowStyle}>
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
            // One-time convenience prefill, not a live sync — matches "title
            // by default, but editable": only fills it in the first time a
            // video is uploaded and no caption has been typed yet.
            if (!overlayText.value && title) overlayText.setValue(title);
          }}
        >
          {({ open }) => (
            <button type="button" className="btn btn--style-secondary" onClick={() => open()}>
              {publicId.value ? "Replace video" : "Upload video"}
            </button>
          )}
        </CldUploadWidget>
        {publicId.value && (
          <button
            type="button"
            className="btn btn--style-secondary"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              publicId.setValue("");
              overlayText.setValue("");
              musicTrackId.setValue("none");
              audioMode.setValue("replace");
              captionStyle.setValue("white-on-black");
              captionPosition.setValue("bottom");
            }}
          >
            Remove video
          </button>
        )}
      </div>

      {publicId.value && (
        <>
          <div style={rowStyle}>
            <label style={labelStyle} htmlFor="cloudinary-overlay-text">
              Caption text on the video
            </label>
            <input
              id="cloudinary-overlay-text"
              type="text"
              value={overlayText.value ?? ""}
              onChange={(e) => overlayText.setValue(e.target.value)}
              placeholder={title || "Leave blank for no caption"}
            />
            <p style={helpStyle}>Defaults to the post title, but you can change or clear it.</p>
          </div>

          {overlayText.value?.trim() && (
            <>
              <div style={rowStyle}>
                <label style={labelStyle} htmlFor="cloudinary-caption-style">
                  Caption style
                </label>
                <select
                  id="cloudinary-caption-style"
                  value={captionStyle.value || "white-on-black"}
                  onChange={(e) => captionStyle.setValue(e.target.value)}
                >
                  <option value="white-on-black">White text, black background</option>
                  <option value="black-on-white">Black text, white background</option>
                  <option value="white-on-red">White text, red background</option>
                  <option value="white-no-bg">White text, no background</option>
                  <option value="black-no-bg">Black text, no background</option>
                </select>
              </div>

              <div style={rowStyle}>
                <label style={labelStyle} htmlFor="cloudinary-caption-position">
                  Caption position
                </label>
                <select
                  id="cloudinary-caption-position"
                  value={captionPosition.value || "bottom"}
                  onChange={(e) => captionPosition.setValue(e.target.value)}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </>
          )}

          <div style={rowStyle}>
            <label style={labelStyle} htmlFor="cloudinary-music-track">
              Background music
            </label>
            <select
              id="cloudinary-music-track"
              value={musicTrackId.value ?? "none"}
              onChange={(e) => musicTrackId.setValue(e.target.value)}
            >
              <option value="none">No music</option>
              {MUSIC_LIBRARY.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
            {MUSIC_LIBRARY.length === 0 && (
              <p style={helpStyle}>No tracks in the library yet — this post will use its own audio as-is.</p>
            )}
          </div>

          {hasMusic && (
            <div style={rowStyle}>
              <label style={labelStyle} htmlFor="cloudinary-audio-mode">
                Original audio
              </label>
              <select
                id="cloudinary-audio-mode"
                value={audioMode.value || "replace"}
                onChange={(e) => audioMode.setValue(e.target.value)}
              >
                <option value="replace">Replace with the music track</option>
                <option value="mix">Keep it, mixed in under the music</option>
              </select>
            </div>
          )}

          {previewUrl && (
            <div style={rowStyle}>
              <span style={labelStyle}>Preview</span>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- admin-only preview, not public-facing */}
              <video key={previewUrl} src={previewUrl} controls playsInline style={{ maxWidth: 360, borderRadius: 4 }} />
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
