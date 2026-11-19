// Shared by the posting screen (to explain problems BEFORE the owner taps
// "Post it") and the server action (to enforce the same rules). Plain words
// only — these are shown to the owner as-is.

export type PlatformRules = { platform: string; label: string; maxCaptionChars: number; needsPhotoOrVideo: boolean };

// lib/socialPost.ts appends "\n\nRead more: <link>" to every caption.
const LINK_ALLOWANCE = 120;
export const MAX_MESSAGE_CHARS = 5000;

// Instagram and TikTok both reject clips shorter than this.
const MIN_SOCIAL_VIDEO_SECONDS = 3;

export function findPostProblems(input: {
  message: string;
  hasPhoto: boolean;
  /** Length of the attached video in seconds; undefined when there's no video, null when unknown. */
  videoSeconds?: number | null;
  platforms: PlatformRules[];
}): string[] {
  const problems: string[] = [];
  const length = input.message.trim().length;
  const hasVideo = input.videoSeconds !== undefined;
  if (length === 0) problems.push("Please write a message for your post.");
  if (length > MAX_MESSAGE_CHARS) {
    problems.push(`Your message is too long. Please shorten it by about ${length - MAX_MESSAGE_CHARS} letters.`);
  }
  for (const p of input.platforms) {
    if (p.needsPhotoOrVideo && !input.hasPhoto && !hasVideo) {
      problems.push(`${p.label} needs a photo or video. Please add one, or turn ${p.label} off.`);
    }
    if (p.needsPhotoOrVideo && hasVideo && input.videoSeconds != null && input.videoSeconds < MIN_SOCIAL_VIDEO_SECONDS) {
      problems.push(`${p.label} needs a video at least ${MIN_SOCIAL_VIDEO_SECONDS} seconds long. Please use a longer one, or turn ${p.label} off.`);
    }
    const max = p.maxCaptionChars - LINK_ALLOWANCE;
    if (length > max && max < MAX_MESSAGE_CHARS) {
      problems.push(`Your message is too long for ${p.label}. Please shorten it by about ${length - max} letters.`);
    }
  }
  return problems;
}
