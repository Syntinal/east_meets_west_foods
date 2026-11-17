import { truncateWords } from "@/lib/newsText";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";

// The two decisions /manage makes FOR the owner when they add a video, so
// the only question they're asked is "Add music? Yes / No". Used by both
// the posting screen (for the preview) and the server action (for what's
// saved), so the preview always matches what actually gets posted.

/** The words shown on the video: the first line of the post, kept short. */
export function captionFromMessage(message: string): string {
  const firstLine = message.split("\n").find((line) => line.trim()) ?? "";
  return truncateWords(firstLine, 60);
}

// Everyday, upbeat tracks from the owner's library. Seasonal ones (Lunar New
// Year) and the short logo sting are left out of automatic picks — they're
// still available in /admin's full Video Studio.
const EVERYDAY_TRACK_IDS = [
  "pop-shorts",
  "social-media-mix",
  "upbeat-energetic-tiktok",
  "indie-rock-food-review",
  "asian-chinese-music",
];

/**
 * Picks a track automatically. Seeded by the post's one-time code, so the
 * same post always gets the same song (the preview and the real post
 * match) while different posts don't all sound identical.
 */
export function pickTrackId(seed: string): string {
  const tracks = EVERYDAY_TRACK_IDS.filter((id) => MUSIC_LIBRARY.some((t) => t.id === id));
  if (tracks.length === 0) return MUSIC_LIBRARY[0]?.id ?? "none";
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return tracks[hash % tracks.length];
}

export function trackPublicId(trackId: string): string | null {
  return MUSIC_LIBRARY.find((t) => t.id === trackId)?.publicId ?? null;
}

/**
 * Cloudinary's free-plan upload limit for one video (same as /admin's Video
 * Studio). Confirmed Nov 2026 on this account that adding music + a caption
 * on the fly works on a 46.7MB clip — an often-quoted 40MB free-plan limit
 * for on-the-fly video editing didn't apply at that size.
 */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
