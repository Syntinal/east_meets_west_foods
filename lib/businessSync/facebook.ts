import { phoneDigits, streetLine, WEEKDAYS, type BusinessInfo } from "@/lib/businessInfo";

// Pushes phone, address and regular hours to the Facebook Page through the
// Graph API (free). Connection = 2 env vars:
//
//   FACEBOOK_PAGE_ID — the Page's numeric id
//   FACEBOOK_PAGE_ACCESS_TOKEN — a long-lived Page token with the
//     pages_manage_metadata permission, generated once by a Page admin from
//     their own Meta developer app (an app the admin owns can use that
//     permission on their own Page without Meta's App Review).
//
// This is separate from Post for Me (lib/socialPost.ts), which only posts —
// it can't edit Page details.
//
// Facebook's API has no field for holiday / special hours, so those are
// listed as a "do it yourself" item on the sync screen instead.

const GRAPH = "https://graph.facebook.com/v23.0";

export function isFacebookConnected(): boolean {
  return Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

export class FacebookSyncError extends Error {}

/** {"mon_1_open": "12:00", "mon_1_close": "18:00", ...} — a day that's missing is closed. */
export function buildFacebookHours(info: BusinessInfo): Record<string, string> {
  const hours: Record<string, string> = {};
  for (const d of WEEKDAYS) {
    const h = info.hours[d.key];
    if (!h.open) continue;
    hours[`${d.fb}_1_open`] = h.opensAt;
    hours[`${d.fb}_1_close`] = h.closesAt;
  }
  return hours;
}

function explain(body: unknown): string {
  const err = (body as { error?: { code?: number; message?: string } })?.error;
  if (err?.code === 190) return "The Facebook connection has expired. It needs to be connected again.";
  if (err?.code === 10 || err?.code === 200) return "Facebook didn't give the website permission to change the Page's details.";
  return `Facebook didn't accept the change${err?.message ? `: ${err.message}` : "."}`;
}

async function graph(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH}/${path}`, { ...init, cache: "no-store" });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || body.error) throw new FacebookSyncError(explain(body));
  return body;
}

export async function pushFacebook(info: BusinessInfo, opts: { includeAddress: boolean }): Promise<void> {
  const params = new URLSearchParams({
    access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
    phone: info.phone,
    hours: JSON.stringify(buildFacebookHours(info)),
  });
  if (opts.includeAddress) {
    params.set(
      "location",
      JSON.stringify({ street: streetLine(info.address), city: info.address.city, state: info.address.state, zip: info.address.zip, country: "United States" }),
    );
  }
  await graph(process.env.FACEBOOK_PAGE_ID ?? "", { method: "POST", body: params });
}

/** Facebook applies changes immediately, so reading them back tells us whether they took. Returns what's still different. */
export async function checkFacebook(info: BusinessInfo): Promise<string[]> {
  const token = encodeURIComponent(process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "");
  const page = await graph(`${process.env.FACEBOOK_PAGE_ID}?fields=phone,hours&access_token=${token}`);
  const different: string[] = [];
  if (phoneDigits(String(page.phone ?? "")) !== phoneDigits(info.phone)) different.push("phone number");
  const want = buildFacebookHours(info);
  const have = (page.hours ?? {}) as Record<string, string>;
  const same = Object.keys({ ...want, ...have }).every((k) => want[k] === have[k]);
  if (!same) different.push("hours");
  return different;
}
