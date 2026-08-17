import type { GlobalConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// A one-row snapshot of Upload-Post's monthly quota (10 uploads/month on
// the free tier), so the owner can see "how many posts are left" in
// /admin instead of only finding out by hitting a 429 on a real post.
// Upload-Post's own API doesn't expose a reliable standalone "check my
// usage" endpoint (see lib/facebookPost.ts's comment) — every real post
// attempt's response (success or 429) already includes a `usage: {
// count, limit, last_reset }` object, so collections/News.ts's afterChange
// hook just captures that and writes it here each time, rather than
// polling anything separately. Never updated in mock mode (no real
// response to read usage from), so this stays empty until real
// UPLOAD_POST_API_KEY credentials are set and at least one real post has
// gone out.
//
// admin.hidden: true — this is written automatically, never hand-edited;
// components/admin/UploadPostUsageNotice.tsx reads it and surfaces a
// plain-language summary in the News list view instead.
export const UploadPostUsage: GlobalConfig = {
  slug: "upload-post-usage",
  label: "Upload-Post Usage",
  admin: { hidden: true },
  access: {
    read: authenticated,
    update: authenticated,
  },
  fields: [
    { name: "count", type: "number", admin: { description: "Uploads used this cycle, as of the last real post attempt." } },
    { name: "limit", type: "number", admin: { description: "Upload-Post's monthly cap for the current plan." } },
    { name: "lastReset", type: "text", admin: { description: "When Upload-Post's own docs say the count resets — exact format is whatever their API returns, not parsed further." } },
  ],
};
