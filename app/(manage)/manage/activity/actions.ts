"use server";

import { getManageSession } from "@/lib/manage/auth";
import { logActivity } from "@/lib/activityLog";

// Uploads go straight from the phone (photos to /api/media, videos to
// Cloudinary), so when one fails, our server never hears about it. The
// phone reports it here. Only fixed kinds are accepted — the browser can't
// write arbitrary text into the log. (If the phone is offline, this report
// can't arrive either; the failure is still shown on screen.)
const MESSAGES = {
  photo: "A photo didn't upload (the connection may have dropped)",
  video: "A video didn't upload (the connection may have dropped)",
} as const;

export async function reportUploadProblem(kind: keyof typeof MESSAGES): Promise<void> {
  if (!(kind in MESSAGES)) return;
  const { payload, user } = await getManageSession();
  if (!user) return;
  await logActivity(payload, { summary: MESSAGES[kind], status: "failed", area: "photo", who: user.email });
}
