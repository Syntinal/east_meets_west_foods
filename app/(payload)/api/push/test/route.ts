import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";
import { sendPushToAllSubscriptions } from "@/lib/webPushServer";

// "Send test notification" in components/admin/PushReminderButton.tsx —
// lets whoever just enabled reminders confirm their device actually
// receives one, without waiting for the real cron condition (no post in
// N days, on a checked day) to line up. Sends to every stored subscription,
// same as the real cron does — on a single-admin-device setup that's just
// the one that clicked the button, but see CLAUDE.md: this project turned
// out to have 3 real admin users, so more than one device could plausibly
// be enrolled.
export async function POST(req: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPushToAllSubscriptions({
    title: "East Meets West Foods",
    body: "Test notification — if you can see this, reminders are working.",
    url: "/admin",
  });

  return NextResponse.json(result);
}
