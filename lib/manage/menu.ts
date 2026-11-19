import { businessToday } from "@/lib/businessDate";
import type { ManageSession, ManageUser } from "./auth";

type Payload = ManageSession["payload"];

export type PriceRow = { label: string; price: string; note?: string | null };
export type MenuItemView = {
  id: number | string;
  title: string;
  group: "main" | "extras";
  tag: string | null;
  description: string | null;
  image: { id: number | string; url: string | null } | null;
  priceOptions: PriceRow[];
  order: number;
  /** live = website matches; changes = saved edits not on the website yet; new = never been on the website */
  status: "live" | "changes" | "new";
  soldOut: boolean;
};

type RawItem = {
  id: number | string;
  title?: string;
  group?: "main" | "extras";
  tag?: string | null;
  description?: string | null;
  image?: { id: number | string; url?: string | null } | number | string | null;
  priceOptions?: PriceRow[] | null;
  order?: number | null;
  _status?: string;
};

function toView(latest: RawItem, live: RawItem | undefined, soldOut: Set<string>): MenuItemView {
  const img = latest.image && typeof latest.image === "object" ? latest.image : null;
  return {
    id: latest.id,
    title: latest.title ?? "",
    group: latest.group ?? "main",
    tag: latest.tag ?? null,
    description: latest.description ?? null,
    image: img ? { id: img.id, url: img.url ?? null } : null,
    priceOptions: (latest.priceOptions ?? []).map((p) => ({ label: p.label ?? "", price: p.price ?? "", note: p.note ?? null })),
    // The LIVE row's order: reordering writes only the live row
    // (app/(payload)/api/reorder), so a pending draft's own `order` is stale.
    order: live?.order ?? latest.order ?? 0,
    status: live?._status !== "published" ? "new" : latest._status === "draft" ? "changes" : "live",
    soldOut: soldOut.has(String(latest.id)),
  };
}

export async function getSoldOutToday(payload: Payload, user: ManageUser): Promise<Set<string>> {
  const res = await payload.find({
    collection: "menu-sold-out",
    overrideAccess: false,
    user,
    where: { soldOutOn: { equals: businessToday() } },
    limit: 200,
    depth: 0,
  });
  return new Set(res.docs.map((d) => String((d as unknown as { item: string | number }).item)));
}

/** Every menu item as the owner last saved it, with whether that's on the website yet. */
export async function listMenuItems(payload: Payload, user: ManageUser): Promise<MenuItemView[]> {
  const [latest, live, soldOut] = await Promise.all([
    payload.find({ collection: "menu-items", draft: true, overrideAccess: false, user, limit: 200, depth: 1 }),
    payload.find({ collection: "menu-items", draft: false, overrideAccess: false, user, limit: 200, depth: 0 }),
    getSoldOutToday(payload, user),
  ]);
  const liveById = new Map(live.docs.map((d) => [String(d.id), d as unknown as RawItem]));
  return latest.docs
    .map((d) => toView(d as unknown as RawItem, liveById.get(String(d.id)), soldOut))
    .sort((a, b) => a.order - b.order);
}

export async function getMenuItem(payload: Payload, user: ManageUser, id: string): Promise<MenuItemView | null> {
  try {
    const [latest, live, soldOut] = await Promise.all([
      payload.findByID({ collection: "menu-items", id, draft: true, overrideAccess: false, user, depth: 1 }),
      payload.findByID({ collection: "menu-items", id, draft: false, overrideAccess: false, user, depth: 0 }),
      getSoldOutToday(payload, user),
    ]);
    return toView(latest as unknown as RawItem, live as unknown as RawItem, soldOut);
  } catch {
    return null;
  }
}

export type MenuChange = {
  id: number | string;
  title: string;
  isNew: boolean;
  /** Plain-English list of what's different from the website. */
  differences: { what: string; before: string; after: string }[];
  preview: MenuItemView;
};

const priceText = (rows: PriceRow[] | null | undefined) =>
  (rows ?? []).map((r) => `${r.label} ${r.price}${r.note ? ` (${r.note})` : ""}`).join(", ") || "(none)";

/** Menu items with saved changes that aren't on the website yet, and what changed. */
export async function listMenuChanges(payload: Payload, user: ManageUser): Promise<MenuChange[]> {
  const items = await listMenuItems(payload, user);
  const waiting = items.filter((i) => i.status !== "live");
  return Promise.all(
    waiting.map(async (item) => {
      if (item.status === "new") {
        return { id: item.id, title: item.title, isNew: true, differences: [], preview: item };
      }
      const live = (await payload.findByID({
        collection: "menu-items",
        id: item.id,
        draft: false,
        overrideAccess: false,
        user,
        depth: 0,
      })) as unknown as RawItem;
      const liveImageId = live.image && typeof live.image === "object" ? live.image.id : (live.image ?? null);
      const differences: MenuChange["differences"] = [];
      const cmp = (what: string, before: string | null | undefined, after: string | null | undefined) => {
        if ((before ?? "") !== (after ?? "")) differences.push({ what, before: before || "(empty)", after: after || "(empty)" });
      };
      cmp("Name", live.title, item.title);
      cmp("Small label", live.tag, item.tag);
      cmp("Description", live.description, item.description);
      cmp("Prices", priceText(live.priceOptions), priceText(item.priceOptions));
      if (String(liveImageId ?? "") !== String(item.image?.id ?? "")) {
        differences.push({ what: "Photo", before: liveImageId ? "Old photo" : "(no photo)", after: item.image ? "New photo" : "(no photo)" });
      }
      return { id: item.id, title: item.title, isNew: false, differences, preview: item };
    }),
  );
}

export async function countChangesWaiting(payload: Payload, user: ManageUser): Promise<number> {
  const items = await listMenuItems(payload, user);
  return items.filter((i) => i.status !== "live").length;
}
