"use server";

import { getManageSession } from "@/lib/manage/auth";
import { logActivity } from "@/lib/activityLog";
import { businessToday } from "@/lib/businessDate";
import { normalizeBusinessInfo, validateBusinessInfo, type BusinessInfo } from "@/lib/businessInfo";
import { getBusinessInfo } from "@/lib/businessInfoServer";
import { markListing, refreshGoogleStatus, syncBusinessInfo, type AutoPlatform } from "@/lib/businessSync";
import { MANUAL_LISTINGS, FACEBOOK_MANUAL, FACEBOOK_SPECIAL_MANUAL, GOOGLE_MANUAL } from "@/lib/businessSync/listings";

// /manage/business ("Hours, address & phone"). Saving goes through the
// normal Payload update, so globals/BusinessInfo.ts's hook does the rest:
// refreshes the website and sends the change to Google / Facebook.

type Result = { ok: true } | { ok: false; message: string; needsAddressConfirm?: boolean };

const SIGNED_OUT: Result = { ok: false, message: "You've been signed out. Please sign in again." };

export async function saveBusinessInfo(input: BusinessInfo, opts: { addressConfirmed: boolean }): Promise<Result> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;

  const info = normalizeBusinessInfo(input);
  // Past holidays have done their job; dropping them keeps the list short.
  const today = businessToday();
  info.specialDays = info.specialDays.filter((d) => d.date >= today);
  const problems = validateBusinessInfo(info);
  if (problems.length) return { ok: false, message: problems.join(" ") };

  const before = await getBusinessInfo(payload);
  if (JSON.stringify(before.address) !== JSON.stringify(info.address) && !opts.addressConfirmed) {
    return { ok: false, needsAddressConfirm: true, message: "Please confirm the address change first." };
  }

  try {
    await payload.updateGlobal({ slug: "business-info", overrideAccess: false, user, data: info as never });
    return { ok: true };
  } catch (err) {
    payload.logger.error(`[manage/business] ${err instanceof Error ? err.message : String(err)}`);
    await logActivity(payload, {
      summary: "Couldn't change the hours, address or phone",
      status: "failed",
      area: "other",
      who: (user as { email?: string }).email,
    });
    return { ok: false, message: "Something went wrong, and nothing was changed. Please try again." };
  }
}

export async function sendAgain(platform: AutoPlatform): Promise<Result> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  if (platform !== "google" && platform !== "facebook") return { ok: false, message: "Unknown place." };
  await syncBusinessInfo(payload, await getBusinessInfo(payload), { force: true, only: platform });
  return { ok: true };
}

export async function checkGoogleNow(): Promise<Result> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  await refreshGoogleStatus(payload, { force: true });
  return { ok: true };
}

const LISTING_KEYS = new Set([...MANUAL_LISTINGS, GOOGLE_MANUAL, FACEBOOK_MANUAL, FACEBOOK_SPECIAL_MANUAL].map((l) => l.key));

export async function markListingAction(key: string, action: "done" | "skip" | "unskip"): Promise<Result> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  if (!LISTING_KEYS.has(key) || !["done", "skip", "unskip"].includes(action)) return { ok: false, message: "Unknown place." };
  try {
    await markListing(payload, key, await getBusinessInfo(payload), action);
    return { ok: true };
  } catch (err) {
    payload.logger.error(`[manage/business] mark ${key}: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
