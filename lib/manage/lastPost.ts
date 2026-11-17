import type { ManageSession, ManageUser } from "./auth";

const SOCIAL_STATUS_FIELDS = [
  "socialMedia.facebookPostStatus",
  "socialMedia.instagramPostStatus",
  "socialMedia.tikTokPostStatus",
] as const;

/**
 * When the last post that actually went out to at least one social platform
 * happened — a *successful* post, not just an attempt (a post whose every
 * platform failed doesn't count). Returns null if there's never been one.
 *
 * Uses the post's publishedDate (falling back to createdAt) as "when."
 * Close enough for a "3 days ago" nudge; Phase 6's activity log will record
 * the exact moment each platform confirms.
 */
export async function getLastSuccessfulPostDate(payload: ManageSession["payload"], user: ManageUser): Promise<Date | null> {
  const res = await payload.find({
    collection: "news-posts",
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    sort: "-publishedDate",
    where: {
      and: [{ _status: { equals: "published" } }, { or: SOCIAL_STATUS_FIELDS.map((f) => ({ [f]: { equals: "posted" } })) }],
    },
  });
  const doc = res.docs[0] as unknown as { publishedDate?: string | null; createdAt?: string } | undefined;
  const when = doc?.publishedDate ?? doc?.createdAt;
  return when ? new Date(when) : null;
}

// The restaurant's own calendar day (Ponderay/Sandpoint, ID), not the
// server's — Vercel runs in UTC, which would flip "today" to "yesterday"
// every evening Pacific time.
const BUSINESS_TZ = "America/Los_Angeles";
const dayNumber = (d: Date) => {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(d); // YYYY-MM-DD
  return Date.parse(`${ymd}T00:00:00Z`) / 86_400_000;
};

/** "today", "yesterday", "3 days ago" — plain words instead of a date stamp. */
export function daysAgoInWords(date: Date, now = new Date()): string {
  const days = Math.round(dayNumber(now) - dayNumber(date));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
