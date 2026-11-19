import type { ManageSession, ManageUser } from "./auth";
import { getPreviewURL } from "@/lib/preview";
import { logActivity } from "@/lib/activityLog";
import { getLinkTargets, type LinkTarget } from "./linkTargets";
import {
  buildCustomPageDef,
  buildSectionData,
  customPageId,
  customPageSlug,
  describeValue,
  getPageDef,
  readField,
  WEBSITE_PAGES,
  type FieldValue,
  type PageDef,
  type PageSlug,
} from "./websitePages";

// Website page operations behind /manage ("Change words or photos"). Each
// takes the signed-in session (checked by the server-action wrappers in
// app/(manage)/manage/website/actions.ts) and passes that user with
// overrideAccess: false.
//
// Two kinds of page, one set of operations: the built-in pages are Payload
// GLOBALS (globals/*.ts); the owner's custom pages are documents in the
// "pages" COLLECTION, edited block by block. A small `Store` per page hides
// the difference (which API to call, and where a section's fields live).
//
// IMPORTANT — Payload's restoreGlobalVersion()/restoreVersion() are NOT used
// here. Tested on the local test DB (Nov 2026): restoring a global version
// with draft: true wrote the unpublished text straight onto the LIVE page,
// and restoring a draft version with draft: false took the page live in an
// unpublished state. Instead, Undo / "Throw away" re-save the earlier
// version's content through a normal update — unpublished (draft: true)
// when it should stay off the website, published when it's putting back
// what was live. A draft save never touches the live page.

export type S = { payload: ManageSession["payload"]; user: ManageUser };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
export type PageUndo = { slug: PageSlug; expectLatest: string; restoreVersion: string };

const SOMETHING_WRONG = "Something went wrong, and nothing was changed. Please try again.";

type Doc = Record<string, unknown>;
type Version = { id: string | number; version: Doc & { _status?: string } };

function contentOf(v: Version): Doc {
  const { id: _i, createdAt: _c, updatedAt: _u, globalType: _g, _status: _s, ...data } = v.version;
  return data;
}

/** Objects merge key by key; anything else (text, arrays, ids) is replaced. */
function deepMerge(base: Doc, patch: Doc): Doc {
  const out: Doc = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const b = base[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)
        ? deepMerge(b as Doc, v as Doc)
        : v;
  }
  return out;
}

type Store = {
  versions(limit?: number): Promise<Version[]>;
  doc(draft: boolean, depth: number): Promise<Doc>;
  saveDraft(data: Doc): Promise<void>;
  publish(): Promise<void>;
  resave(v: Version, activity: string): Promise<void>;
  /** Where a section's fields live inside the doc. */
  root(doc: Doc, sectionKey: string): Doc | undefined;
  /** Turns one section's changed fields into the update `data`. */
  wrap(latest: Doc, sectionKey: string, sectionData: Doc): Doc;
};

function storeFor(s: S, def: PageDef): Store {
  const label = def.name ?? def.label;
  if (def.source.kind === "global") {
    const slug = def.source.slug;
    return {
      async versions(limit = 20) {
        const res = await s.payload.findGlobalVersions({ slug, sort: "-updatedAt", limit, depth: 0, overrideAccess: false, user: s.user });
        return res.docs as unknown as Version[];
      },
      async doc(draft, depth) {
        return (await s.payload.findGlobal({ slug, draft, depth, overrideAccess: false, user: s.user })) as unknown as Doc;
      },
      async saveDraft(data) {
        // draft: true → saved, NOT on the website.
        await s.payload.updateGlobal({ slug, draft: true, overrideAccess: false, user: s.user, data: data as never });
      },
      async publish() {
        await s.payload.updateGlobal({ slug, draft: false, overrideAccess: false, user: s.user, data: { _status: "published" } as never });
      },
      async resave(v, activity) {
        const publish = v.version._status === "published";
        await s.payload.updateGlobal({
          slug,
          draft: !publish,
          overrideAccess: false,
          user: s.user,
          data: { ...contentOf(v), _status: publish ? "published" : "draft" } as never,
          context: { activity },
        });
      },
      root: (doc) => doc,
      wrap: (_latest, _key, data) => data,
    };
  }

  const id = def.source.id;
  const blocksOf = (doc: Doc) => ((doc.layout as Doc[] | undefined) ?? []) as Doc[];
  return {
    async versions(limit = 20) {
      const res = await s.payload.findVersions({
        collection: "pages",
        where: { parent: { equals: id } },
        sort: "-updatedAt",
        limit,
        depth: 0,
        overrideAccess: false,
        user: s.user,
      });
      return res.docs as unknown as Version[];
    },
    async doc(draft, depth) {
      return (await s.payload.findByID({ collection: "pages", id, draft, depth, overrideAccess: false, user: s.user })) as unknown as Doc;
    },
    async saveDraft(data) {
      await s.payload.update({
        collection: "pages",
        id,
        draft: true,
        overrideAccess: false,
        user: s.user,
        data: data as never,
        context: { activity: `Saved changes to the ${label} page (not on the website yet)` },
      });
    },
    async publish() {
      await s.payload.update({ collection: "pages", id, draft: false, overrideAccess: false, user: s.user, data: { _status: "published" } as never });
    },
    async resave(v, activity) {
      const publish = v.version._status === "published";
      await s.payload.update({
        collection: "pages",
        id,
        draft: !publish,
        overrideAccess: false,
        user: s.user,
        data: { ...contentOf(v), _status: publish ? "published" : "draft" } as never,
        context: { activity },
      });
    },
    root: (doc, key) => blocksOf(doc).find((b) => b.id === key),
    // The whole layout goes back (it's one field), with just this block changed.
    wrap: (latest, key, data) => ({ layout: blocksOf(latest).map((b) => (b.id === key ? deepMerge(b, data) : b)) }),
  };
}

/** The page's definition: fixed for built-in pages, read from the page's blocks for custom ones. */
export async function resolvePageDef(s: S, slug: string): Promise<PageDef | null> {
  const builtIn = getPageDef(slug);
  if (builtIn) return builtIn;
  const id = customPageId(slug);
  if (!id) return null;
  try {
    // Only pages that are on the website (see listCustomPageDefs).
    const live = (await s.payload.findByID({ collection: "pages", id, draft: false, depth: 0, overrideAccess: false, user: s.user })) as unknown as {
      _status?: string;
    };
    if (live._status !== "published") return null;
    const doc = await s.payload.findByID({ collection: "pages", id, draft: true, depth: 0, overrideAccess: false, user: s.user });
    return buildCustomPageDef(doc as unknown as Parameters<typeof buildCustomPageDef>[0]);
  } catch {
    return null;
  }
}

/**
 * The owner's custom pages: ones that are on the website. Pages started in
 * /admin but never put on the website are left out — they're unfinished
 * (several abandoned ones exist, two of them also called "Store Hours"),
 * and starting a new page is done in /admin.
 */
export async function listCustomPageDefs(s: S): Promise<PageDef[]> {
  const live = await s.payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    sort: "title",
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user: s.user,
  });
  const defs: PageDef[] = [];
  for (const d of live.docs as unknown as { id: number | string }[]) {
    const def = await resolvePageDef(s, customPageSlug(d.id));
    if (def) defs.push(def);
  }
  return defs;
}

export async function listAllPageDefs(s: S): Promise<PageDef[]> {
  return [...WEBSITE_PAGES, ...(await listCustomPageDefs(s))];
}

async function newestIsDraft(store: Store): Promise<boolean> {
  const [newest] = await store.versions(1);
  return newest?.version._status === "draft";
}

export async function hasWaitingChanges(s: S, def: PageDef): Promise<boolean> {
  return newestIsDraft(storeFor(s, def));
}

export type SectionView = { key: string; title: string; values: Record<string, FieldValue> };
export type PageView = {
  slug: PageSlug;
  label: string;
  sitePath: string;
  previewUrl: string;
  waiting: boolean;
  elsewhere?: string;
  sections: SectionView[];
  linkTargets: LinkTarget[];
};

/** The page as last saved (what the owner is editing), section by section. */
export async function getPageView(s: S, def: PageDef): Promise<PageView> {
  const store = storeFor(s, def);
  const [latest, waiting, linkTargets] = await Promise.all([store.doc(true, 1), newestIsDraft(store), getLinkTargets(s)]);
  return {
    slug: def.slug,
    label: def.label,
    sitePath: def.sitePath,
    // Draft-mode preview of the real page with its saved changes.
    previewUrl: getPreviewURL(def.sitePath),
    waiting,
    elsewhere: def.elsewhere,
    linkTargets,
    sections: def.sections.map((sec) => {
      const root = store.root(latest, sec.key);
      return { key: sec.key, title: sec.title, values: Object.fromEntries(sec.fields.map((f) => [f.path, readField(root, f)])) };
    }),
  };
}

async function failed(s: S, summary: string, err: unknown) {
  // Recorded on its own (no req), so it survives the failed operation.
  await logActivity(s.payload, { summary, status: "failed", area: "page", who: s.user.email });
  s.payload.logger.error(`[manage/website] ${err instanceof Error ? err.message : String(err)}`);
}

export async function savePageSection(
  s: S,
  input: { slug: string; sectionKey: string; values: Record<string, FieldValue> },
): Promise<Result<{ undo: PageUndo | null }>> {
  const def = await resolvePageDef(s, input.slug);
  const section = def?.sections.find((x) => x.key === input.sectionKey);
  if (!def || !section || section.fields.length === 0) return { ok: false, message: SOMETHING_WRONG };
  const store = storeFor(s, def);
  try {
    const latest = await store.doc(true, 0);
    const root = store.root(latest, section.key);
    if (!root) return { ok: false, message: "This part of the page was changed or removed somewhere else. Please go back and open the page again." };
    const data = store.wrap(latest, section.key, buildSectionData(section, input.values, root));
    await store.saveDraft(data);
    const [newest, previous] = await store.versions(2);
    return {
      ok: true,
      undo: newest && previous ? { slug: def.slug, expectLatest: String(newest.id), restoreVersion: String(previous.id) } : null,
    };
  } catch (err) {
    await failed(s, `Couldn't save a change to the ${def.name ?? def.label} page`, err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function publishPage(s: S, slug: string): Promise<Result<{ undo: PageUndo | null }>> {
  const def = await resolvePageDef(s, slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  const store = storeFor(s, def);
  try {
    const before = await store.versions();
    const previousPublished = before.find((v) => v.version._status === "published");
    // Publishes the latest saved version of the page (all its saved sections).
    await store.publish();
    const [newest] = await store.versions(1);
    return {
      ok: true,
      undo: newest && previousPublished ? { slug: def.slug, expectLatest: String(newest.id), restoreVersion: String(previousPublished.id) } : null,
    };
  } catch (err) {
    await failed(s, `Couldn't put the ${def.name ?? def.label} page on the website`, err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function publishPages(s: S, slugs: string[]): Promise<Result<{ published: number; failed: number }>> {
  let published = 0;
  let failedCount = 0;
  for (const slug of slugs) {
    const r = await publishPage(s, slug);
    if (r.ok) published++;
    else failedCount++;
  }
  return { ok: true, published, failed: failedCount };
}

/** "Throw away these changes": the page's saved-but-waiting edits go away; the website stays as it is. */
export async function discardPageChanges(s: S, slug: string): Promise<Result> {
  const def = await resolvePageDef(s, slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  const store = storeFor(s, def);
  try {
    const lastPublished = (await store.versions(100)).find((v) => v.version._status === "published");
    if (!lastPublished) return { ok: false, message: "There's no earlier version of this page to go back to. Please reach out for help." };
    await store.resave(lastPublished, `Threw away a change to the ${def.name ?? def.label} page that wasn't on the website yet`);
    return { ok: true };
  } catch (err) {
    await failed(s, `Couldn't throw away a change to the ${def.name ?? def.label} page`, err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function undoPageChange(s: S, token: PageUndo): Promise<Result> {
  const def = await resolvePageDef(s, token.slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  const store = storeFor(s, def);
  try {
    const recent = await store.versions(100);
    if (String(recent[0]?.id) !== token.expectLatest) {
      return { ok: false, message: "This page was changed again after you, so it can't be undone from here. Please reach out for help." };
    }
    const target = recent.find((v) => String(v.id) === token.restoreVersion);
    if (!target) return { ok: false, message: SOMETHING_WRONG };
    await store.resave(target, `Undid a change to the ${def.name ?? def.label} page`);
    return { ok: true };
  } catch (err) {
    await failed(s, `Couldn't undo a change to the ${def.name ?? def.label} page`, err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export type PageChange = {
  type: "page";
  slug: PageSlug;
  title: string;
  previewUrl: string;
  differences: { what: string; before: string; after: string }[];
};

/** Pages with saved changes that aren't on the website yet, and what changed, section by section. */
export async function listPageChanges(s: S): Promise<PageChange[]> {
  const out: PageChange[] = [];
  for (const def of await listAllPageDefs(s)) {
    const store = storeFor(s, def);
    if (!(await newestIsDraft(store))) continue;
    const [latest, live] = await Promise.all([store.doc(true, 1), store.doc(false, 1).catch(() => ({}) as Doc)]);
    const differences: PageChange["differences"] = [];
    for (const sec of def.sections) {
      const liveRoot = store.root(live, sec.key);
      const latestRoot = store.root(latest, sec.key);
      for (const f of sec.fields) {
        const before = readField(liveRoot, f);
        const after = readField(latestRoot, f);
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        const what = sec.fields.length > 1 ? `${sec.title} — ${f.label}` : sec.title;
        if (f.kind === "photo") {
          differences.push({ what, before: before ? "The current photo" : "(no photo)", after: after ? "A new photo" : "(no photo)" });
        } else {
          differences.push({ what, before: describeValue(f, before), after: describeValue(f, after) });
        }
      }
    }
    out.push({ type: "page", slug: def.slug, title: def.label, previewUrl: getPreviewURL(def.sitePath), differences });
  }
  return out;
}

export async function countPagesWaiting(s: S): Promise<number> {
  const defs = await listAllPageDefs(s);
  const flags = await Promise.all(defs.map((d) => hasWaitingChanges(s, d)));
  return flags.filter(Boolean).length;
}
