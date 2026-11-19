import { BUSINESS_TZ } from "@/lib/businessDate";

// Plain words for posts and the home page banner. Pure — used on the
// server (lists) and in the browser (the editor and posting screens).

export type BannerPick = "off" | "always" | "keep" | 1 | 3 | 7;

export const BANNER_PICKS: { value: BannerPick; label: string; state?: string }[] = [
  { value: "off", label: "Don't show it there" },
  { value: 1, label: "Show it today only" },
  { value: 3, label: "Show it for 3 days" },
  { value: 7, label: "Show it for a week" },
  { value: "always", label: "Show it until I take it off" },
];

/** What the server action expects. */
export function bannerChoiceOf(pick: BannerPick): { on: boolean; days: number | null | "keep" } {
  if (pick === "off") return { on: false, days: null };
  if (pick === "always") return { on: true, days: null };
  if (pick === "keep") return { on: true, days: "keep" };
  return { on: true, days: pick };
}

export function postDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ });
}

/** "until Friday, November 21" — the last day it shows (the end is midnight starting the next day). */
export function bannerUntil(endIso: string): string {
  const lastDay = new Date(new Date(endIso).getTime() - 60_000);
  return lastDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ });
}
