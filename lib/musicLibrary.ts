// The News "Video Studio" (components/admin/CloudinaryVideoStudio.tsx) lets
// the owner pick a background-music track from this small, curated list —
// deliberately not a self-service "upload new music" admin flow. Adding a
// track is a two-step manual process: (1) upload the properly-licensed
// audio file to Cloudinary under `resource_type: "video"` (Cloudinary
// treats audio-only files under its video resource type — there's no
// separate "audio" resource type), e.g. via the `cloudinary` package's
// `uploader.upload(localFilePath, { resource_type: "video", public_id,
// folder: "music-library" })`; (2) add one entry here with that same
// `publicId`. Keeping this as a flat array (not a Payload collection) is a
// deliberate simplification — there's no reason a non-technical owner needs
// to manage this list day-to-day, and it keeps the licensing decision (what
// tracks are safe to use commercially) out of the admin UI entirely.
//
// Every track here must be commercially licensed with no attribution
// required (e.g. Pixabay Music's Content License, or a CC0/public-domain
// source like FreePD) — this is a real business's public-facing content,
// not a personal project.
export type MusicTrack = {
  id: string;
  label: string;
  // The Cloudinary public_id the track was uploaded under (see the note
  // above) — NOT a file path or URL.
  publicId: string;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  // Phase 1 (standard social-media/TikTok-style) and phase 2 (Chinese
  // traditional) tracks, both sourced from Pixabay Music (Content License,
  // no attribution required) and uploaded to Cloudinary under
  // "music-library/" per this file's header comment. All 9 are short loops
  // (27s-93s), except "Asian / Chinese Music" (~3min) — front-loaded where
  // it matters, since a track longer than the clip gets trimmed to the
  // video's length rather than the video being extended (see CLAUDE.md
  // item 28).
  { id: "pop-shorts", label: "Pop Shorts", publicId: "music-library/pop-shorts" },
  {
    id: "social-media-mix",
    label: "Social Media Mix",
    publicId: "music-library/social-media-mix",
  },
  {
    id: "upbeat-energetic-tiktok",
    label: "Upbeat & Energetic (TikTok)",
    publicId: "music-library/upbeat-energetic-tiktok",
  },
  { id: "audio-library", label: "Audio Library", publicId: "music-library/audio-library" },
  {
    id: "future-bass-logo",
    label: "Future Bass Logo",
    publicId: "music-library/future-bass-logo",
  },
  {
    id: "indie-rock-food-review",
    label: "Indie Rock (Food Review)",
    publicId: "music-library/indie-rock-food-review",
  },
  {
    id: "chinese-lunar-new-year",
    label: "Chinese Lunar New Year",
    publicId: "music-library/chinese-lunar-new-year",
  },
  {
    id: "asian-chinese-music",
    label: "Asian / Chinese Music",
    publicId: "music-library/asian-chinese-music",
  },
  {
    id: "grand-chinese-future-bass",
    label: "Grand Chinese Future Bass",
    publicId: "music-library/grand-chinese-future-bass",
  },
];
