import { upcomingSpecialDays, type BusinessInfo } from "@/lib/businessInfo";
import { connection, isOutOfDate, type AutoPlatform, type PushState, type SyncStatus } from "./index";
import { FACEBOOK_MANUAL, FACEBOOK_SPECIAL_MANUAL, GOOGLE_MANUAL, MANUAL_LISTINGS, type ManualListing } from "./listings";

// Turns the stored sync status into the rows /manage/business shows: one
// per place the info appears, each with a plain-words state and the buttons
// that make sense for it. Pure (no fetching), so it's easy to reason about.

export type Tone = "good" | "warn" | "bad" | "neutral";
export type RowAction = "resend" | "check" | "done" | "skip" | "unskip";

export type BoardRow = {
  key: string;
  name: string;
  tone: Tone;
  headline: string;
  detail?: string;
  link?: { href: string; label: string };
  how?: string;
  actions: RowAction[];
  /** For "resend"/"check". */
  platform?: AutoPlatform;
  test?: boolean;
};

export type Board = { automatic: BoardRow[]; byHand: BoardRow[]; notListed: BoardRow[]; waitingOnGoogle: boolean };

export function timeAgo(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const NAMES: Record<AutoPlatform, string> = { google: "Google (Search & Maps)", facebook: "Facebook Page" };

function autoRow(platform: AutoPlatform, s: PushState | null, info: BusinessInfo, today: string): BoardRow {
  const test = connection(platform) === "test";
  const base = { key: platform, name: NAMES[platform], platform, test };
  const scope = platform === "google" ? "all" : "regular";
  if (!s) {
    return { ...base, tone: "warn", headline: "Not sent yet", detail: "Press “Send now” to send your current info.", actions: ["resend"] };
  }
  if (s.state === "failed") {
    return { ...base, tone: "bad", headline: "Couldn't update", detail: s.message, actions: ["resend"] };
  }
  if (isOutOfDate(s, info, scope, today) || s.addressPending) {
    return { ...base, tone: "warn", headline: "Not sent yet", detail: "Your latest change hasn't gone out here.", actions: ["resend"] };
  }
  if (s.state === "pending") {
    return {
      ...base,
      tone: "warn",
      headline: "Sent, waiting for Google to show it",
      detail: `Sent ${timeAgo(s.sentAt)}. Google usually takes about 10 minutes, sometimes longer. This page checks again by itself.`,
      actions: ["check"],
    };
  }
  if (s.state === "differs") {
    return { ...base, tone: "bad", headline: "Showing something different", detail: s.message, actions: ["resend", ...(platform === "google" ? (["check"] as const) : [])] };
  }
  return {
    ...base,
    tone: "good",
    headline: "Up to date",
    detail: platform === "google" ? `Google confirmed it ${timeAgo(s.checkedAt)}.` : `Updated ${timeAgo(s.sentAt)}.`,
    actions: [],
  };
}

function manualRow(l: ManualListing, status: SyncStatus, info: BusinessInfo, today: string): BoardRow {
  const s = status.listings[l.key];
  const base = { key: l.key, name: l.name, link: { href: l.url, label: `Open ${l.name}` }, how: l.how };
  if (s?.skipped) return { ...base, tone: "neutral", headline: "You said the restaurant isn't listed here", actions: ["unskip"] };
  if (!s?.done) return { ...base, tone: "warn", headline: "Not checked yet", detail: "Make sure it matches, then press “I've updated it”.", actions: ["done", "skip"] };
  if (isOutOfDate(s, info, l.scope, today)) {
    return { ...base, tone: "warn", headline: "Needs updating", detail: "Something changed since you last updated it here.", actions: ["done", "skip"] };
  }
  return { ...base, tone: "good", headline: "Up to date", detail: `You updated it ${timeAgo(s.doneAt)}.`, actions: [] };
}

export function buildBoard(info: BusinessInfo, status: SyncStatus, today: string): Board {
  const automatic: BoardRow[] = [
    { key: "website", name: "This website", tone: "good", headline: "Up to date", detail: "Changes show on the website right away.", actions: [] },
  ];
  const manual: ManualListing[] = [];

  for (const p of ["google", "facebook"] as const) {
    if (connection(p) === "none") manual.push(p === "google" ? GOOGLE_MANUAL : FACEBOOK_MANUAL);
    else automatic.push(autoRow(p, status[p], info, today));
  }
  if (connection("facebook") !== "none" && upcomingSpecialDays(info, today).length > 0) manual.push(FACEBOOK_SPECIAL_MANUAL);
  manual.push(...MANUAL_LISTINGS);

  const rows = manual.map((l) => manualRow(l, status, info, today));
  return {
    automatic,
    byHand: rows.filter((r) => r.tone !== "neutral"),
    notListed: rows.filter((r) => r.tone === "neutral"),
    waitingOnGoogle: status.google?.state === "pending" && connection("google") !== "none",
  };
}
