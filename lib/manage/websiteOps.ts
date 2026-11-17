import type { ManageSession, ManageUser } from "./auth";
import { getPreviewURL } from "@/lib/preview";
import { logActivity } from "@/lib/activityLog";
import {
  buildSectionData,
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
// IMPORTANT — Payload's restoreGlobalVersion() is NOT used anywhere here.
// Tested on the local test DB (Nov 2026): restoring a global version with
// draft: true wrote the unpublished text straight onto the LIVE page, and
// restoring a draft version with draft: false took the page live in an
// unpublished state. Globals behave differently from collections here.
// Instead, Undo / "Throw away" re-save the earlier version's content
// through a normal updateGlobal — unpublished (draft: true) when it should
// stay off the website, published when it's putting back what was live.
// Both were verified to leave the live page correct.

export type S = { payload: ManageSession["payload"]; user: ManageUser };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
export type PageUndo = { slug: PageSlug; expectLatest: string; restoreVersion: string };

const SOMETHING_WRONG = "Something went wrong, and nothing was changed. Please try again.";

type Version = { id: string | number; version: Record<string, unknown> & { _status?: string } };

async function versions(s: S, slug: PageSlug, limit = 20): Promise<Version[]> {
  const res = await s.payload.findGlobalVersions({
    slug,
    sort: "-updatedAt",
    limit,
    depth: 0,
    overrideAccess: false,
    user: s.user,
  });
  return res.docs as unknown as Version[];
}

function contentOf(v: Version): Record<string, unknown> {
  const { id: _i, createdAt: _c, updatedAt: _u, globalType: _g, _status: _s, ...data } = v.version;
  return data;
}

/** Re-save an earlier version's content. Published versions are re-published; anything else is saved unpublished. */
async function resaveVersion(s: S, slug: PageSlug, v: Version, activity: string) {
  const publish = v.version._status === "published";
  await s.payload.updateGlobal({
    slug,
    draft: !publish,
    overrideAccess: false,
    user: s.user,
    data: { ...contentOf(v), _status: publish ? "published" : "draft" } as never,
    context: { activity },
  });
}

async function getDocs(s: S, slug: PageSlug) {
  const [latest, live] = await Promise.all([
    s.payload.findGlobal({ slug, draft: true, depth: 1, overrideAccess: false, user: s.user }),
    s.payload.findGlobal({ slug, draft: false, depth: 1, overrideAccess: false, user: s.user }),
  ]);
  return { latest: latest as unknown as Record<string, unknown>, live: live as unknown as Record<string, unknown> };
}

export async function hasWaitingChanges(s: S, slug: PageSlug): Promise<boolean> {
  const [newest] = await versions(s, slug, 1);
  return newest?.version._status === "draft";
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
};

/** The page as last saved (what the owner is editing), section by section. */
export async function getPageView(s: S, def: PageDef): Promise<PageView> {
  const [{ latest }, waiting] = await Promise.all([getDocs(s, def.slug), hasWaitingChanges(s, def.slug)]);
  return {
    slug: def.slug,
    label: def.label,
    sitePath: def.sitePath,
    // Draft-mode preview of the real page with its saved changes.
    previewUrl: getPreviewURL(def.sitePath),
    waiting,
    elsewhere: def.elsewhere,
    sections: def.sections.map((sec) => ({
      key: sec.key,
      title: sec.title,
      values: Object.fromEntries(sec.fields.map((f) => [f.path, readField(latest, f)])),
    })),
  };
}

export async function savePageSection(
  s: S,
  input: { slug: string; sectionKey: string; values: Record<string, FieldValue> },
): Promise<Result<{ undo: PageUndo | null }>> {
  const def = getPageDef(input.slug);
  const section = def?.sections.find((x) => x.key === input.sectionKey);
  if (!def || !section) return { ok: false, message: SOMETHING_WRONG };
  try {
    const latest = (await s.payload.findGlobal({ slug: def.slug, draft: true, depth: 0, overrideAccess: false, user: s.user })) as unknown as Record<string, unknown>;
    const data = buildSectionData(section, input.values, latest);
    // draft: true → saved, NOT on the website (a draft save never touches the live page).
    await s.payload.updateGlobal({ slug: def.slug, draft: true, overrideAccess: false, user: s.user, data: data as never });
    const [newest, previous] = await versions(s, def.slug, 2);
    return {
      ok: true,
      undo: newest && previous ? { slug: def.slug, expectLatest: String(newest.id), restoreVersion: String(previous.id) } : null,
    };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: `Couldn't save a change to the ${getPageDef(input.slug)?.label ?? ""} page`, status: "failed", area: "page", who: s.user.email });
    s.payload.logger.error(`[manage/website] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function publishPage(s: S, slug: string): Promise<Result<{ undo: PageUndo | null }>> {
  const def = getPageDef(slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  try {
    const before = await versions(s, def.slug);
    const previousPublished = before.find((v) => v.version._status === "published");
    // Publishes the latest saved version of the page (all its saved sections).
    await s.payload.updateGlobal({ slug: def.slug, draft: false, overrideAccess: false, user: s.user, data: { _status: "published" } as never });
    const [newest] = await versions(s, def.slug, 1);
    return {
      ok: true,
      undo: newest && previousPublished ? { slug: def.slug, expectLatest: String(newest.id), restoreVersion: String(previousPublished.id) } : null,
    };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: `Couldn't put the ${getPageDef(slug)?.label ?? ""} page on the website`, status: "failed", area: "page", who: s.user.email });
    s.payload.logger.error(`[manage/website] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function publishPages(s: S, slugs: string[]): Promise<Result<{ published: number; failed: number }>> {
  let published = 0;
  let failed = 0;
  for (const slug of slugs) {
    const r = await publishPage(s, slug);
    if (r.ok) published++;
    else failed++;
  }
  return { ok: true, published, failed };
}

/** "Throw away these changes": the page's saved-but-waiting edits go away; the website stays as it is. */
export async function discardPageChanges(s: S, slug: string): Promise<Result> {
  const def = getPageDef(slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  try {
    const lastPublished = (await versions(s, def.slug, 100)).find((v) => v.version._status === "published");
    if (!lastPublished) return { ok: false, message: "There's no earlier version of this page to go back to. Please ask for help." };
    await resaveVersion(s, def.slug, lastPublished, `Threw away a change to the ${def.label} page that wasn't on the website yet`);
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: `Couldn't throw away a change to the ${getPageDef(slug)?.label ?? ""} page`, status: "failed", area: "page", who: s.user.email });
    s.payload.logger.error(`[manage/website] ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function undoPageChange(s: S, token: PageUndo): Promise<Result> {
  const def = getPageDef(token.slug);
  if (!def) return { ok: false, message: SOMETHING_WRONG };
  try {
    const recent = await versions(s, def.slug, 100);
    if (String(recent[0]?.id) !== token.expectLatest) {
      return { ok: false, message: "This page was changed again after you, so it can't be undone from here. Please ask for help." };
    }
    const target = recent.find((v) => String(v.id) === token.restoreVersion);
    if (!target) return { ok: false, message: SOMETHING_WRONG };
    await resaveVersion(s, def.slug, target, `Undid a change to the ${def.label} page`);
    return { ok: true };
  } catch (err) {
    // Recorded on its own (no req), so it survives the failed operation.
    await logActivity(s.payload, { summary: `Couldn't undo a change to the ${getPageDef(token.slug)?.label ?? ""} page`, status: "failed", area: "page", who: s.user.email });
    s.payload.logger.error(`[manage/website] ${err instanceof Error ? err.message : String(err)}`);
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
  for (const def of WEBSITE_PAGES) {
    if (!(await hasWaitingChanges(s, def.slug))) continue;
    const { latest, live } = await getDocs(s, def.slug);
    const differences: PageChange["differences"] = [];
    for (const sec of def.sections) {
      for (const f of sec.fields) {
        const before = readField(live, f);
        const after = readField(latest, f);
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
  const flags = await Promise.all(WEBSITE_PAGES.map((p) => hasWaitingChanges(s, p.slug)));
  return flags.filter(Boolean).length;
}
