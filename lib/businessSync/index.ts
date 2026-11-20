import type { Payload } from "payload";
import { businessToday } from "@/lib/businessDate";
import { fingerprint, normalizeBusinessInfo, type BusinessInfo, type FingerprintScope } from "@/lib/businessInfo";
import { checkGoogle, describeGoogleFields, isGoogleConnected, pushGoogle } from "./google";
import { checkFacebook, isFacebookConnected, pushFacebook } from "./facebook";

// Sends business info to the places that can be updated automatically
// (Google, Facebook) and remembers where each place stands, in
// globals/BusinessSync.ts. Called from globals/BusinessInfo.ts's
// afterChange hook (every save, from /manage or /admin) and from the
// "Try again" / "Check now" buttons on /manage/business.
//
// Nothing here throws: a failed push is recorded as a "failed" status with
// a plain-words reason, shown on the sync screen.
//
// Test mode: with BUSINESS_SYNC_MOCK=1 (never in production), an
// unconnected platform behaves as if connected — Google goes "pending" and
// turns "live" about a minute later; Facebook goes live at once. Lets the
// screen be tried end to end before the real connections exist.

export type AutoPlatform = "google" | "facebook";

export type PushState = {
  state: "pending" | "live" | "failed" | "differs";
  /** Snapshot of the info last successfully sent (compared with the current info to spot changes). */
  sent?: BusinessInfo;
  sentAt?: string;
  checkedAt?: string;
  /** Plain-words detail: why it failed, or what Google is showing differently. */
  message?: string;
  /** The address changed and hasn't been sent to this platform yet. */
  addressPending?: boolean;
};

export type ListingState = { done?: BusinessInfo; doneAt?: string; skipped?: boolean };

export type SyncStatus = {
  google: PushState | null;
  facebook: PushState | null;
  listings: Record<string, ListingState>;
};

const SCOPE: Record<AutoPlatform, FingerprintScope> = { google: "all", facebook: "regular" };

export const isMockSync = () => process.env.BUSINESS_SYNC_MOCK === "1" && process.env.NODE_ENV !== "production";

export function connection(platform: AutoPlatform): "connected" | "test" | "none" {
  const real = platform === "google" ? isGoogleConnected() : isFacebookConnected();
  if (real) return "connected";
  return isMockSync() ? "test" : "none";
}

export async function getSyncStatus(payload: Payload): Promise<SyncStatus> {
  const doc = (await payload.findGlobal({ slug: "business-sync", overrideAccess: true, depth: 0 })) as unknown as Partial<
    Record<keyof SyncStatus, unknown>
  >;
  const obj = <T>(v: unknown): T | null => (v && typeof v === "object" ? (v as T) : null);
  return {
    google: obj<PushState>(doc.google),
    facebook: obj<PushState>(doc.facebook),
    listings: obj<Record<string, ListingState>>(doc.listings) ?? {},
  };
}

/** Merges `patch` into the stored status, re-reading first so concurrent writers don't undo each other. */
async function saveSyncStatus(payload: Payload, patch: Partial<SyncStatus>): Promise<void> {
  const current = await getSyncStatus(payload);
  await payload.updateGlobal({
    slug: "business-sync",
    overrideAccess: true,
    data: { ...current, ...patch, listings: { ...current.listings, ...(patch.listings ?? {}) } } as never,
  });
}

/** True when this platform was last sent something different from `info` (ignores holidays that are now in the past). */
export function isOutOfDate(state: PushState | ListingState | null | undefined, info: BusinessInfo, scope: FingerprintScope, today = businessToday()): boolean {
  const snap = state && ("sent" in state ? state.sent : "done" in state ? state.done : undefined);
  if (!snap) return true;
  return fingerprint(normalizeBusinessInfo(snap), scope, today) !== fingerprint(info, scope, today);
}

const now = () => new Date().toISOString();
const errMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

async function pushOne(platform: AutoPlatform, info: BusinessInfo, prev: PushState | null, opts: { addressChanged: boolean }): Promise<PushState> {
  const addressPending = Boolean(prev?.addressPending || opts.addressChanged);
  const mode = connection(platform);
  const today = businessToday();
  try {
    if (mode === "test") {
      await new Promise((r) => setTimeout(r, 300));
      if (platform === "google") return { state: "pending", sent: info, sentAt: now(), checkedAt: now() };
      return { state: "live", sent: info, sentAt: now(), checkedAt: now() };
    }
    if (platform === "google") {
      await pushGoogle(info, today, { includeAddress: addressPending });
      const sent: PushState = { state: "pending", sent: info, sentAt: now() };
      return await checkGoogleState(sent);
    }
    await pushFacebook(info, { includeAddress: addressPending });
    const different = await checkFacebook(info);
    return different.length
      ? { state: "differs", sent: info, sentAt: now(), checkedAt: now(), message: `Facebook is still showing a different ${different.join(" and ")}.` }
      : { state: "live", sent: info, sentAt: now(), checkedAt: now() };
  } catch (err) {
    return { ...(prev ?? {}), state: "failed", message: errMessage(err), checkedAt: now(), addressPending };
  }
}

async function checkGoogleState(s: PushState): Promise<PushState> {
  try {
    const { pendingFields, differentFields } = await checkGoogle();
    if (pendingFields.length) return { ...s, state: "pending", checkedAt: now(), message: undefined };
    if (differentFields.length) {
      return {
        ...s,
        state: "differs",
        checkedAt: now(),
        message: `Google is showing a different ${describeGoogleFields(differentFields)} than yours. Google sometimes changes listings from customer suggestions. Check your Business Profile, or press "Send again" to put yours back.`,
      };
    }
    return { ...s, state: "live", checkedAt: now(), message: undefined };
  } catch (err) {
    // The push itself worked; only the follow-up check failed. Stay
    // "pending" and try again next time the screen is opened.
    return { ...s, state: s.state === "live" ? "live" : "pending", checkedAt: now(), message: errMessage(err) };
  }
}

/**
 * Sends `info` to every connected platform that doesn't already have it.
 * `force` resends even when nothing changed (the "Send again" button).
 */
export async function syncBusinessInfo(
  payload: Payload,
  info: BusinessInfo,
  opts: { addressChanged?: boolean; force?: boolean; only?: AutoPlatform } = {},
): Promise<void> {
  try {
    const status = await getSyncStatus(payload);
    const platforms = (["google", "facebook"] as const).filter((p) => (!opts.only || opts.only === p) && connection(p) !== "none");
    const due = platforms.filter((p) => {
      const s = status[p];
      return opts.force || opts.addressChanged || !s || s.state === "failed" || s.addressPending || isOutOfDate(s, info, SCOPE[p]);
    });
    if (due.length === 0) return;
    const results = await Promise.all(due.map((p) => pushOne(p, info, status[p], { addressChanged: Boolean(opts.addressChanged) })));
    await saveSyncStatus(payload, Object.fromEntries(due.map((p, i) => [p, results[i]])));
  } catch (err) {
    payload.logger.error(`[business-sync] ${errMessage(err)}`);
  }
}

/** Re-checks Google while a change is pending (Google takes a while). Throttled to once a minute. */
export async function refreshGoogleStatus(payload: Payload, opts: { force?: boolean } = {}): Promise<void> {
  try {
    const status = await getSyncStatus(payload);
    const s = status.google;
    if (!s || (s.state !== "pending" && s.state !== "differs")) return;
    const last = s.checkedAt ? Date.parse(s.checkedAt) : 0;
    if (!opts.force && Date.now() - last < 60_000) return;
    const mode = connection("google");
    if (mode === "none") return;
    let next: PushState;
    if (mode === "test") {
      const sentAt = s.sentAt ? Date.parse(s.sentAt) : 0;
      next = { ...s, state: Date.now() - sentAt > 60_000 ? "live" : "pending", checkedAt: now() };
    } else {
      next = await checkGoogleState(s);
    }
    await saveSyncStatus(payload, { google: next });
  } catch (err) {
    payload.logger.error(`[business-sync] google check: ${errMessage(err)}`);
  }
}

/** The owner says they've updated a by-hand place (or that the restaurant isn't listed there). */
export async function markListing(payload: Payload, key: string, info: BusinessInfo, action: "done" | "skip" | "unskip"): Promise<void> {
  const status = await getSyncStatus(payload);
  const prev = status.listings[key] ?? {};
  const next: ListingState =
    action === "done" ? { done: info, doneAt: now() } : action === "skip" ? { ...prev, skipped: true } : { ...prev, skipped: false };
  await saveSyncStatus(payload, { listings: { [key]: next } });
}
