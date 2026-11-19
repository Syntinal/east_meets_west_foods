import type { ManageSession, ManageUser } from "@/lib/manage/auth";
import { businessToday } from "@/lib/businessDate";
import { logActivity } from "@/lib/activityLog";
import type { PriceRow } from "@/lib/manage/menu";

// The menu operations behind /manage's menu screens. Each takes the
// signed-in session (checked by the thin server-action wrappers in
// app/(manage)/manage/menu/actions.ts) and passes that user with
// overrideAccess: false,
// so Menu Items' own access rules apply. All writes go through Payload's
// normal create/update/restoreVersion — the collection's hooks (site
// revalidation, the trash-safety hook) run exactly as they do from /admin.
//
// Saving vs publishing, without ever saying "draft" to the owner:
//   Save            → update with draft: true  (website unchanged)
//   Put on website  → update with _status: "published" (publishes the
//                     latest saved version)

export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/**
 * What "Undo" needs. Re-checked on the server before anything is restored:
 * the item's newest version must still be the one this change created —
 * otherwise someone saved after it, and undoing would wipe out their work.
 */
export type S = { payload: ManageSession["payload"]; user: ManageUser };

export type UndoToken =
  | { kind: "restore"; id: number | string; expectLatest: string; restoreVersion: string; asDraft: boolean }
  | { kind: "unpublish"; id: number | string; expectLatest: string };

const SOMETHING_WRONG = "Something went wrong, and nothing was changed. Please try again.";

type VersionDoc = { id: string | number; version: { _status?: string } };
async function recentVersions(payload: ManageSession["payload"], user: ManageUser, id: number | string, limit = 10) {
  const res = await payload.findVersions({
    collection: "menu-items",
    where: { parent: { equals: id } },
    sort: "-updatedAt",
    limit,
    depth: 0,
    overrideAccess: false,
    user,
  });
  return res.docs as unknown as VersionDoc[];
}

function cleanPrices(rows: PriceRow[]): PriceRow[] | string {
  const kept = rows
    .map((r) => ({ label: (r.label ?? "").trim(), price: (r.price ?? "").trim(), note: r.note?.trim() || null }))
    .filter((r) => r.label || r.price);
  if (kept.length === 0) return "Please add at least one price.";
  if (kept.some((r) => !r.label || !r.price)) return "Each price needs both a size (like “Small”) and a price. Fill both in, or remove that row.";
  // "8.99" → "$8.99", matching how existing prices are written.
  return kept.map((r) => ({ ...r, price: /^\d/.test(r.price) ? `$${r.price}` : r.price }));
}

export async function saveMenuItem(s: S, input: {
  id?: number | string;
  group?: "main" | "extras";
  title: string;
  tag: string;
  description: string;
  imageId: number | string | null;
  priceOptions: PriceRow[];
}): Promise<Result<{ id: number | string; undo: UndoToken | null }>> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "Please give this item a name." };
  const prices = cleanPrices(input.priceOptions);
  if (typeof prices === "string") return { ok: false, message: prices };

  const fields = {
    title,
    tag: input.tag.trim() || null,
    description: input.description.trim() || null,
    image: input.imageId ?? null,
    priceOptions: prices,
  };

  try {
    if (!input.id) {
      // New item: saved but not on the website until "Put on website".
      // Goes to the end of its section.
      const last = await s.payload.find({
        collection: "menu-items",
        overrideAccess: false,
        user: s.user,
        sort: "-order",
        limit: 1,
        depth: 0,
      });
      const lastOrder = Number((last.docs[0] as unknown as { order?: number })?.order ?? 0);
      const created = await s.payload.create({
        collection: "menu-items",
        overrideAccess: false,
        user: s.user,
        draft: true,
        data: { ...fields, group: input.group ?? "main", order: lastOrder + 10, _status: "draft" } as never,
      });
      return { ok: true, id: created.id, undo: null };
    }

    await s.payload.update({
      collection: "menu-items",
      id: input.id,
      overrideAccess: false,
      user: s.user,
      draft: true,
      data: fields as never,
    });
    const [newest, previous] = await recentVersions(s.payload, s.user, input.id, 2);
    const undo: UndoToken | null =
      newest && previous
        ? { kind: "restore", id: input.id, expectLatest: String(newest.id), restoreVersion: String(previous.id), asDraft: true }
        : null;
    return { ok: true, id: input.id, undo };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't save a menu change", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

async function publishOne(s: S, id: number | string): Promise<UndoToken | null> {
  // Keep the LIVE order: reordering writes only the live row, so the saved
  // version's own `order` can be stale and would otherwise move the item
  // back to an old position when published.
  const live = (await s.payload.findByID({
    collection: "menu-items",
    id,
    draft: false,
    overrideAccess: false,
    user: s.user,
    depth: 0,
  })) as unknown as { order?: number; _status?: string };
  const wasLive = live._status === "published";
  const before = await recentVersions(s.payload, s.user, id);
  const previousPublished = before.find((v) => v.version._status === "published");

  // A plain { _status: "published" } update merges onto the latest saved
  // version — which here is exactly what should go live.
  await s.payload.update({
    collection: "menu-items",
    id,
    overrideAccess: false,
    user: s.user,
    draft: false,
    data: { _status: "published", order: live.order ?? 0 } as never,
  });
  const [newest] = await recentVersions(s.payload, s.user, id, 1);
  if (!newest) return null;
  if (!wasLive || !previousPublished) return { kind: "unpublish", id, expectLatest: String(newest.id) };
  return { kind: "restore", id, expectLatest: String(newest.id), restoreVersion: String(previousPublished.id), asDraft: false };
}

export async function publishMenuItem(s: S, id: number | string): Promise<Result<{ undo: UndoToken | null }>> {
  try {
    return { ok: true, undo: await publishOne(s, id) };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't put a menu change on the website", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function publishMenuItems(s: S, ids: (number | string)[]): Promise<Result<{ published: number; failed: number }>> {
  let published = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await publishOne(s, id);
      published++;
    } catch (err) {
      failed++;
      await logActivity(s.payload, { summary: "Couldn't put a menu change on the website", status: "failed", area: "menu", who: s.user.email });
      s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: true, published, failed };
}

/** "Throw away this change": the saved edit stops waiting; the website version stays. */
export async function discardMenuChanges(s: S, id: number | string): Promise<Result> {
  try {
    const versions = await recentVersions(s.payload, s.user, id, 50);
    const lastPublished = versions.find((v) => v.version._status === "published");
    if (!lastPublished) return { ok: false, message: "This item has never been on the website, so there's nothing to go back to. You can remove it instead." };
    // As a DRAFT restore: only the saved (waiting) version changes; the
    // live row is untouched. Restoring with draft: false would be wrong for
    // any draft version — confirmed it takes the item off the website.
    await s.payload.restoreVersion({
      collection: "menu-items",
      id: String(lastPublished.id),
      draft: true,
      context: { activity: "Threw away a menu change that wasn't on the website yet" },
      overrideAccess: false,
      user: s.user,
    });
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't throw away a menu change", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function undoMenuChange(s: S, token: UndoToken): Promise<Result> {
  try {
    const [newest] = await recentVersions(s.payload, s.user, token.id, 1);
    if (!newest || String(newest.id) !== token.expectLatest) {
      return { ok: false, message: "This was changed again after you, so it can't be undone from here. Please ask for help." };
    }
    if (token.kind === "unpublish") {
      // First time on the website → take it back off. The content stays saved.
      await s.payload.update({
        collection: "menu-items",
        id: token.id,
        overrideAccess: false,
        user: s.user,
        draft: false,
        data: { _status: "draft" } as never,
        context: { activity: "Undid adding a new item to the website — it's saved but not on the website" },
      });
      return { ok: true };
    }
    const target = (await s.payload.findVersionByID({
      collection: "menu-items",
      id: token.restoreVersion,
      overrideAccess: false,
      user: s.user,
      depth: 0,
    })) as unknown as { parent: number | string | { id: number | string }; version: { _status?: string } };
    const parentId = typeof target.parent === "object" ? target.parent.id : target.parent;
    if (String(parentId) !== String(token.id)) return { ok: false, message: SOMETHING_WRONG };
    // Never restore a draft version with draft: false — that takes the item
    // off the website (confirmed on the test DB).
    if (!token.asDraft && target.version._status !== "published") return { ok: false, message: SOMETHING_WRONG };
    await s.payload.restoreVersion({
      collection: "menu-items",
      id: token.restoreVersion,
      draft: token.asDraft,
      context: { activity: token.asDraft ? "Undid a saved menu change" : "Undid putting a menu change on the website" },
      overrideAccess: false,
      user: s.user,
    });
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't undo a menu change", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function setSoldOutToday(s: S, itemId: number | string, soldOut: boolean): Promise<Result> {
  try {
    const existing = await s.payload.find({
      collection: "menu-sold-out",
      overrideAccess: false,
      user: s.user,
      where: { item: { equals: itemId } },
      limit: 1,
      depth: 0,
    });
    const soldOutOn = soldOut ? businessToday() : null;
    if (existing.docs[0]) {
      await s.payload.update({
        collection: "menu-sold-out",
        id: existing.docs[0].id,
        overrideAccess: false,
        user: s.user,
        data: { soldOutOn } as never,
      });
    } else if (soldOut) {
      await s.payload.create({
        collection: "menu-sold-out",
        overrideAccess: false,
        user: s.user,
        data: { item: itemId, soldOutOn } as never,
      });
    }
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't change “sold out today”", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function removeMenuItem(s: S, id: number | string): Promise<Result> {
  try {
    // collections/MenuItems.ts's beforeChange hook keeps the live content
    // intact when trashing, so bringing it back restores it exactly.
    await s.payload.update({
      collection: "menu-items",
      id,
      overrideAccess: false,
      user: s.user,
      data: { deletedAt: new Date().toISOString() } as never,
    });
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't remove a menu item", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function restoreMenuItem(s: S, id: number | string): Promise<Result> {
  try {
    await s.payload.update({
      collection: "menu-items",
      id,
      trash: true,
      overrideAccess: false,
      user: s.user,
      data: { deletedAt: null } as never,
    });
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: "Couldn't bring back a menu item", status: "failed", area: "menu", who: s.user.email });
    s.payload.logger.error(`[manage/menu] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function listRemovedMenuItems(s: S): Promise<Result<{ items: { id: number | string; title: string; removedAt: string }[] }>> {
  const res = await s.payload.find({
    collection: "menu-items",
    trash: true,
    overrideAccess: false,
    user: s.user,
    where: { deletedAt: { exists: true } },
    sort: "-deletedAt",
    limit: 100,
    depth: 0,
  });
  return {
    ok: true,
    items: res.docs.map((d) => {
      const doc = d as unknown as { id: number | string; title?: string; deletedAt: string };
      return { id: doc.id, title: doc.title ?? "(no name)", removedAt: doc.deletedAt };
    }),
  };
}
