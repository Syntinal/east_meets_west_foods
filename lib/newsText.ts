// Shared helpers for deriving short, page-safe text from the single
// free-form "message" box a News post's whole content is authored in (see
// collections/News.ts) — used server-side (to auto-derive the hidden
// title/URL slug the first time a post is ever published, and to build the
// SEO/teaser excerpt at render time) and client-side (to prefill the
// Cloudinary Video Studio's on-screen caption). Pure string functions, no
// Node-only APIs, so the same code runs unchanged in both a server
// component and a "use client" one (see lib/cloudinaryVideo.ts's
// buildOverlayVideoUrl() for the same "one function, both contexts" idiom).

// Collapses whitespace/line breaks and cuts at a word boundary near
// maxLength, rather than mid-word — used for both the internal page
// heading and the SEO/teaser excerpt below.
export function truncateWords(value: string, maxLength: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// The post's internal page heading / <title> / URL-slug source — the owner
// never sees or types this directly (see collections/News.ts's
// `message` field). Derived from the message's first non-blank line so a
// post that opens with a short "hook" line gets a sensible heading rather
// than a random mid-paragraph cut.
export function deriveTitleFromMessage(message: string): string {
  const firstLine = message.split("\n").find((line) => line.trim().length > 0) ?? "";
  return truncateWords(firstLine, 70) || "Untitled";
}

// SEO meta description / /news list-page teaser / homepage News-card blurb
// — computed live from the message wherever it's needed rather than stored,
// so there's exactly one place this text can come from (the message
// itself), not a separately-typed copy that can drift out of sync with it.
export function deriveExcerptFromMessage(message: string): string {
  return truncateWords(message.replace(/\n+/g, " "), 160);
}
