import { phoneE164, streetLine, upcomingSpecialDays, WEEKDAYS, type BusinessInfo } from "@/lib/businessInfo";

// Pushes business info to the Google Business Profile through Google's
// Business Information API (free, but Google has to approve API access for
// the project first). Connection = 4 env vars; see "Hours, address & phone
// sync" in CLAUDE.md for how they're obtained (a one-time sign-in by
// whoever owns or manages the Business Profile).
//
//   GOOGLE_BUSINESS_CLIENT_ID / GOOGLE_BUSINESS_CLIENT_SECRET — our Google Cloud OAuth client
//   GOOGLE_BUSINESS_REFRESH_TOKEN — from that one-time sign-in (scope business.manage)
//   GOOGLE_BUSINESS_LOCATION — the profile's resource name, "locations/1234567890"
//
// Google doesn't apply edits instantly: they usually sit "pending" for
// minutes (sometimes longer) while Google reviews them. getGoogleUpdated
// tells us which fields are still pending (pendingMask) and which ones
// Google is showing differently from what we sent (diffMask).

const API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const MASK_ALWAYS = ["phoneNumbers", "regularHours", "specialHours"];

export function isGoogleConnected(): boolean {
  return Boolean(
    process.env.GOOGLE_BUSINESS_CLIENT_ID &&
      process.env.GOOGLE_BUSINESS_CLIENT_SECRET &&
      process.env.GOOGLE_BUSINESS_REFRESH_TOKEN &&
      process.env.GOOGLE_BUSINESS_LOCATION,
  );
}

export class GoogleSyncError extends Error {}

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !body.access_token) {
    throw new GoogleSyncError(
      body.error === "invalid_grant"
        ? "The Google connection has expired or was removed. It needs to be connected again."
        : "Couldn't sign in to Google.",
    );
  }
  return body.access_token;
}

const timeOfDay = (t: string) => {
  const hours = Number(t.slice(0, 2));
  const minutes = Number(t.slice(3, 5));
  return minutes ? { hours, minutes } : { hours };
};

const googleDate = (d: string) => ({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)), day: Number(d.slice(8, 10)) });

export function buildGoogleLocation(info: BusinessInfo, today: string) {
  return {
    phoneNumbers: { primaryPhone: phoneE164(info.phone) },
    storefrontAddress: {
      regionCode: "US",
      languageCode: "en",
      postalCode: info.address.zip,
      administrativeArea: info.address.state,
      locality: info.address.city,
      addressLines: [streetLine(info.address)],
    },
    regularHours: {
      periods: WEEKDAYS.filter((d) => info.hours[d.key].open).map((d) => ({
        openDay: d.google,
        openTime: timeOfDay(info.hours[d.key].opensAt),
        closeDay: d.google,
        closeTime: timeOfDay(info.hours[d.key].closesAt),
      })),
    },
    // Sending specialHours replaces Google's whole list, so this is always
    // the complete set of upcoming special days.
    specialHours: {
      specialHourPeriods: upcomingSpecialDays(info, today).map((s) =>
        s.closed
          ? { startDate: googleDate(s.date), closed: true }
          : {
              startDate: googleDate(s.date),
              openTime: timeOfDay(s.opensAt),
              endDate: googleDate(s.date),
              closeTime: timeOfDay(s.closesAt),
            },
      ),
    },
  };
}

function explain(status: number, body: unknown): string {
  const err = (body as { error?: { message?: string; status?: string } })?.error;
  if (status === 401) return "The Google connection has expired. It needs to be connected again.";
  if (status === 403 || status === 429) {
    // Before Google approves API access, every call fails with a 0 quota.
    return "Google hasn't allowed the website to make changes yet (API access may still be waiting for approval).";
  }
  if (status === 404) return "Google couldn't find the business listing. The connection settings need checking.";
  if (status === 400) return `Google didn't accept the change: ${err?.message ?? "invalid information"}`;
  return `Google had a problem (${status}). Please try again later.`;
}

/** Sends the info to Google. Address is only included when it actually changed (see the caution in pushGoogle's caller). */
export async function pushGoogle(info: BusinessInfo, today: string, opts: { includeAddress: boolean }): Promise<void> {
  const token = await accessToken();
  const mask = opts.includeAddress ? [...MASK_ALWAYS, "storefrontAddress"] : MASK_ALWAYS;
  const location = buildGoogleLocation(info, today);
  const body = Object.fromEntries(mask.map((k) => [k, location[k as keyof typeof location]]));
  const res = await fetch(`${API}/${process.env.GOOGLE_BUSINESS_LOCATION}?updateMask=${mask.join(",")}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new GoogleSyncError(explain(res.status, await res.json().catch(() => null)));
}

export type GoogleLiveState = { pendingFields: string[]; differentFields: string[] };

/** What Google currently shows vs. what we sent. Only the fields we manage are considered. */
export async function checkGoogle(): Promise<GoogleLiveState> {
  const token = await accessToken();
  const readMask = [...MASK_ALWAYS, "storefrontAddress"].join(",");
  const res = await fetch(`${API}/${process.env.GOOGLE_BUSINESS_LOCATION}:getGoogleUpdated?readMask=${readMask}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { pendingMask?: string; diffMask?: string } | null;
  if (!res.ok) throw new GoogleSyncError(explain(res.status, body));
  const fields = (mask?: string) =>
    (mask ?? "")
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f && readMask.split(",").some((m) => f === m || f.startsWith(`${m}.`)));
  return { pendingFields: fields(body?.pendingMask), differentFields: fields(body?.diffMask) };
}

const FIELD_WORDS: Record<string, string> = {
  phoneNumbers: "phone number",
  regularHours: "hours",
  specialHours: "holiday hours",
  storefrontAddress: "address",
};

export function describeGoogleFields(fields: string[]): string {
  const words = [...new Set(fields.map((f) => FIELD_WORDS[f.split(".")[0]] ?? f))];
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}
