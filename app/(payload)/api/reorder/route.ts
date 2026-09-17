import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import config from "@payload-config";
import { getPayload, type CollectionSlug } from "payload";

// Dedicated, narrow endpoint for admin drag-reorder UIs (see
// components/admin/ListPreviewSplit.tsx's `persistOrder()`).
//
// Deliberately does NOT go through Payload's normal document-update
// REST/Local API (a plain `PATCH /api/<collection>/<id>` is what this used
// to do). That path always builds its update on top of the document's
// *latest saved version* — draft or published, whichever is newer — not
// the currently-live published row (confirmed by reading
// getLatestCollectionVersion.js: it has no "base this on the published
// version" option wired through the update operation). For a drafts-
// enabled collection with a pending, not-yet-approved draft sitting on top
// of a published item, that means even a request that only touches one
// unrelated field (like `order`) writes the *entire* draft — including
// `_status: "draft"` and its unapproved content — straight into the live
// row. A menu item with an in-progress price edit got silently
// un-published and had its unapproved draft text pushed live just from
// being dragged to a new position; see CLAUDE.md for the incident this
// fixes and the controlled test that confirmed the mechanism.
//
// The fix: skip the versioning/merge layer entirely and write only the
// order field directly via the DB adapter (`payload.db.updateOne`, the
// same primitive Payload's own update operation calls one level below the
// merge-with-latest-version step) — a true partial column write with no
// merge involved, so it can never drag along stale draft content or flip
// `_status`. Confirmed via a controlled test (see CLAUDE.md) that this
// leaves `_status` and every other field untouched even with a pending
// draft sitting on top of the published row.
//
// Collections are allowlisted below, one entry per drag-reorder UI that
// actually exists — add a new one (with its own revalidate call, mirroring
// that collection's own `afterChange` hook) before wiring
// `reorderable: true` onto any other collection in ListPreviewView.tsx.
const REORDERABLE: Partial<Record<CollectionSlug, { orderField: string; revalidate: () => void }>> = {
  "menu-items": { orderField: "order", revalidate: () => revalidatePath("/menu") },
};

export async function POST(req: Request) {
  const payload = await getPayload({ config });

  // Same authentication Payload's own generated REST update endpoint
  // would have enforced (collections/MenuItems.ts's
  // `access.update: authenticated`) — this route replaces that endpoint
  // for reordering, so it re-implements the same check by hand instead of
  // inheriting it for free.
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { collectionSlug?: string; items?: { id: string | number; order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { collectionSlug, items } = body;
  const entry = collectionSlug ? REORDERABLE[collectionSlug as CollectionSlug] : undefined;
  if (!entry || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Unknown or unsupported collection for reordering" }, { status: 400 });
  }

  try {
    await Promise.all(
      items.map((item) =>
        payload.db.updateOne({
          collection: collectionSlug as CollectionSlug,
          id: item.id,
          data: { [entry.orderField]: item.order },
        })
      )
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save the new order" },
      { status: 500 }
    );
  }

  entry.revalidate();
  return NextResponse.json({ success: true });
}
