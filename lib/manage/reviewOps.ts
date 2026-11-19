import type { ManageSession, ManageUser } from "./auth";
import { logActivity } from "@/lib/activityLog";

// Customer reviews (the Testimonials collection) for /manage. Reviews skip
// the "save, then put on the website" step: the owner's one explicit action
// is "Put it on the website". Removing is "Take off the website" — the
// review stays saved and can be put back, so nothing is ever lost.
//
// Every write re-sends the review's full content with an explicit _status.
// A bare { _status } update would merge onto the latest saved version and
// could pull in an unpublished edit left in /admin (the Bao Buns trap,
// CLAUDE.md item 27).

export type S = { payload: ManageSession["payload"]; user: ManageUser };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
export type ReviewView = { id: number | string; quote: string; authorName: string; rating: string; onWebsite: boolean };
export type ReviewInput = { quote: string; authorName: string; rating: string };

const SOMETHING_WRONG = "Something went wrong, and nothing was changed. Please try again.";
const RATINGS = ["5", "4", "3"];

async function fail(s: S, summary: string, err: unknown): Promise<{ ok: false; message: string }> {
  // Payload's ValidationError keeps each field's own message in data.errors.
  const fieldMessages = ((err as { data?: { errors?: { message?: string }[] } })?.data?.errors ?? []).map((e) => e.message ?? "");
  const text = [err instanceof Error ? err.message : String(err), ...fieldMessages].join(" | ");
  s.payload.logger.error(`[manage/reviews] ${text}`);
  // The collection's own duplicate check — say it plainly.
  if (/already exists/i.test(text)) return { ok: false, message: "This review is already on the list. Check the reviews below before adding it again." };
  await logActivity(s.payload, { summary, status: "failed", area: "review", who: s.user.email });
  return { ok: false, message: SOMETHING_WRONG };
}

function check(input: ReviewInput): string | null {
  if (!input.quote.trim()) return "Please paste the review's words.";
  if (!input.authorName.trim()) return "Please type the customer's name.";
  if (!RATINGS.includes(input.rating)) return "Please choose how many stars.";
  return null;
}

export async function listReviews(s: S): Promise<ReviewView[]> {
  const res = await s.payload.find({
    collection: "testimonials",
    draft: false,
    overrideAccess: false,
    user: s.user,
    sort: "order",
    limit: 200,
    depth: 0,
  });
  return res.docs.map((d) => {
    const r = d as unknown as { id: number | string; quote?: string; authorName?: string; rating?: string; _status?: string };
    return { id: r.id, quote: r.quote ?? "", authorName: r.authorName ?? "", rating: r.rating ?? "5", onWebsite: r._status === "published" };
  });
}

export async function getReview(s: S, id: string): Promise<ReviewView | null> {
  return (await listReviews(s)).find((r) => String(r.id) === id) ?? null;
}

export async function addReview(s: S, input: ReviewInput): Promise<Result<{ id: number | string }>> {
  const problem = check(input);
  if (problem) return { ok: false, message: problem };
  try {
    const doc = await s.payload.create({
      collection: "testimonials",
      overrideAccess: false,
      user: s.user,
      draft: false,
      data: { quote: input.quote.trim(), authorName: input.authorName.trim(), rating: input.rating, _status: "published" } as never,
    });
    return { ok: true, id: doc.id };
  } catch (err) {
    return fail(s, "Couldn't add a review", err);
  }
}

export async function updateReview(s: S, id: number | string, input: ReviewInput): Promise<Result> {
  const problem = check(input);
  if (problem) return { ok: false, message: problem };
  try {
    await s.payload.update({
      collection: "testimonials",
      id,
      overrideAccess: false,
      user: s.user,
      draft: false,
      data: { quote: input.quote.trim(), authorName: input.authorName.trim(), rating: input.rating, _status: "published" } as never,
    });
    return { ok: true };
  } catch (err) {
    return fail(s, "Couldn't change a review", err);
  }
}

/** Take off / put back on the website, keeping the review's live content exactly. */
export async function setReviewOnWebsite(s: S, id: number | string, onWebsite: boolean): Promise<Result> {
  try {
    const live = (await s.payload.findByID({
      collection: "testimonials",
      id,
      draft: false,
      overrideAccess: false,
      user: s.user,
      depth: 0,
    })) as unknown as Record<string, unknown>;
    const { id: _i, createdAt: _c, updatedAt: _u, ...content } = live;
    await s.payload.update({
      collection: "testimonials",
      id,
      overrideAccess: false,
      user: s.user,
      draft: false,
      data: { ...content, _status: onWebsite ? "published" : "draft" } as never,
    });
    return { ok: true };
  } catch (err) {
    return fail(s, onWebsite ? "Couldn't put a review back on the website" : "Couldn't take a review off the website", err);
  }
}
