import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";
import { sendPushToAllSubscriptions } from "@/lib/webPushServer";

// Vercel Cron hits this daily (see vercel.json) to nudge whoever's enabled
// reminders (components/admin/PushReminderButton.tsx) to create a new News
// post once it's been a while since the last one — settings live in
// globals/ReminderSettings.ts, editable in /admin without a redeploy.
//
// Same CRON_SECRET auth pattern as publish-scheduled/route.ts.
//
// Runs once a day at "0 16 * * *" (16:00 UTC) — chosen, like
// publish-scheduled's own "0 8 * * *", to land at a reasonable local
// morning in Ponderay/Sandpoint, ID (Pacific time): UTC 16:00 is 8am PST /
// 9am PDT. Unlike publish-scheduled, the exact local hour matters a little
// more here (this doc's own day-of-week check below reads getUTCDay()
// directly), but 8-9am Pacific is comfortably clear of the UTC/Pacific day
// boundary (which falls at 4-5pm Pacific, not near this run time) — so
// getUTCDay() at this specific run time reliably matches the actual
// Pacific calendar day, even though it wouldn't near midnight. Same
// accepted DST drift as publish-scheduled (this shifts an hour earlier in
// local time during Daylight Time, not corrected for).
export const maxDuration = 30;

const DAY_INDEX = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayload({ config });

  const settings = await payload.findGlobal({
    slug: "reminder-settings",
    overrideAccess: true,
  });

  if (!settings.enabled) {
    return NextResponse.json({ skipped: "disabled" });
  }

  const today = DAY_INDEX[new Date().getUTCDay()];
  const checkDays = (settings.checkDays as string[] | undefined) || [];
  if (!checkDays.includes(today)) {
    return NextResponse.json({ skipped: "not-a-check-day", today });
  }

  // Most recent News post regardless of published/draft — starting a draft
  // already counts as "working on it" for the purpose of this nudge, so it
  // suppresses the reminder the same as a published post would. No
  // `_status` filter, so this doesn't need the drafts-collection
  // `overrideAccess`/`where` gotcha handling other frontend fetches do —
  // this is trusted server code reading for a threshold check, not
  // rendering to a visitor.
  const latest = await payload.find({
    collection: "news-posts",
    sort: "-createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const minHours = (settings.minHoursSinceLastPost as number | undefined) || 48;
  let hoursSinceLastPost: number | null = null;
  if (latest.docs.length > 0) {
    const createdAt = new Date((latest.docs[0] as { createdAt: string }).createdAt).getTime();
    hoursSinceLastPost = (Date.now() - createdAt) / (1000 * 60 * 60);
  }

  const shouldRemind = hoursSinceLastPost === null || hoursSinceLastPost >= minHours;
  if (!shouldRemind) {
    return NextResponse.json({ skipped: "posted-recently", hoursSinceLastPost });
  }

  const result = await sendPushToAllSubscriptions({
    title: "East Meets West Foods",
    body: (settings.message as string | undefined) || "Haven't posted in a while — want to create a new post?",
    url: "/admin/collections/news-posts/create",
  });

  return NextResponse.json({ reminded: true, hoursSinceLastPost, ...result });
}
