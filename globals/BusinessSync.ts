import type { GlobalConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// Where each place stands with the business info in globals/BusinessInfo.ts:
// what was last sent to Google / Facebook and whether it's live yet, and
// when the owner last updated each by-hand listing (Yelp, Apple Maps…).
// Written only by lib/businessSync/index.ts; shown on /manage/business.
// Kept apart from BusinessInfo so recording a status never re-triggers
// that global's "send it everywhere" hook.
export const BusinessSync: GlobalConfig = {
  slug: "business-sync",
  label: "Business Info Sync Status",
  access: { read: authenticated, update: authenticated },
  admin: { hidden: true },
  fields: [
    { name: "google", type: "json" },
    { name: "facebook", type: "json" },
    { name: "listings", type: "json" },
  ],
};
