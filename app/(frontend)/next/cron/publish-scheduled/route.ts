import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";

// Vercel Cron hits this on a schedule (see vercel.json's `crons` entry) to
// auto-publish any Page whose `publishAt` (collections/Pages.ts) has
// passed while it's still a draft — lets the owner prep a page ahead of
// time (e.g. a seasonal "Holiday Hours" page) without needing to come
// back and click Publish at the right moment.
//
// Runs once a day (vercel.json's `"0 8 * * *"`) rather than every few
// minutes — a small business doesn't need minute-level precision here,
// and it's one less thing running constantly for no real benefit. Two
// things worth knowing about that tradeoff:
//   - "0 8 * * *" is UTC 08:00, chosen to land on actual local midnight in
//     Ponderay/Sandpoint, ID (Pacific time), not literal UTC midnight —
//     "0 0 * * *" would fire at 4-5pm the *previous* afternoon there.
//     Vercel Cron has no timezone setting and can't shift for Daylight
//     Saving on its own, so this drifts to 1am local during Daylight Time
//     (roughly March-November) — a small, accepted imprecision, not a bug.
//   - Once-daily means "sometime that day," not "at the exact minute
//     picked" — whatever time `publishAt` is set to, the actual publish
//     moment is whenever this next runs, so a page scheduled for early
//     morning could sit unpublished most of that day. Fine for what this
//     is for (a seasonal page going live by a given day); revisit if a
//     real need for precise-time publishing ever comes up.
//
// Protected by CRON_SECRET — Vercel's own documented convention: once
// this env var is set, Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on scheduled invocations. Fails
// closed (401) if the header is missing or wrong, including when the env
// var itself isn't set yet, so a misconfigured deployment can't be
// triggered by just anyone hitting this URL. Not set yet as of writing —
// see .env.example.
//
// Vercel Cron only fires against the production deployment, never local
// dev or preview builds — this route can still be exercised directly
// (with the right Authorization header) for local testing, which is how
// it was verified this session.
export const maxDuration = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const now = new Date().toISOString();

  // `draft: true` so a page that's only ever been autosaved/draft-saved
  // (never published) still resolves to its real latest content here, not
  // just the base row — same reasoning as getPage()'s own `draft`/`where`
  // handling in app/(frontend)/[slug]/page.tsx.
  const due = await payload.find({
    collection: "pages",
    draft: true,
    overrideAccess: true,
    where: {
      and: [{ _status: { equals: "draft" } }, { publishAt: { exists: true } }, { publishAt: { less_than_equal: now } }],
    },
    limit: 100,
    depth: 0,
  });

  const results: { id: string | number; slug: string | null; published: boolean; error?: string }[] = [];
  for (const doc of due.docs) {
    const slug = (doc as { slug?: string }).slug ?? null;
    try {
      // `draft: false` + `_status: "published"` in `data` together are
      // what actually promotes a draft to published via the Local API —
      // see the two related gotchas in CLAUDE.md (publishing needs
      // `_status` set explicitly in `data`; `draft` is a sibling option on
      // `update()`, not a field inside `data`). Also clears `publishAt`
      // back to null — once this fires, the field has done its job, and
      // leaving a past date sitting there would read as "still scheduled"
      // to anyone glancing at the edit screen.
      await payload.update({
        collection: "pages",
        id: doc.id,
        draft: false,
        overrideAccess: true,
        data: { _status: "published", publishAt: null },
      });
      results.push({ id: doc.id, slug, published: true });
    } catch (err) {
      results.push({ id: doc.id, slug, published: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ checked: due.totalDocs, published: results.filter((r) => r.published).length, results });
}
