"use server";

import { getManageSession } from "@/lib/manage/auth";
import { logActivity } from "@/lib/activityLog";
import { DAYS, describeSchedule, type ReminderSchedule } from "@/lib/manage/reminderSchedule";

// Changes the shared reminder schedule (globals/ReminderSettings.ts — the
// same settings /admin edits). Only days, the "haven't posted in" gap, and
// pause/resume; the message wording and the daily check time stay in /admin.

const VALID_DAYS = new Set<string>(DAYS.map((d) => d.value));

export async function saveReminderSchedule(input: ReminderSchedule): Promise<{ ok: true; summary: string } | { ok: false; message: string }> {
  const { payload, user } = await getManageSession();
  if (!user) return { ok: false, message: "You've been signed out. Please sign in again." };

  const checkDays = [...new Set(input.checkDays)].filter((d) => VALID_DAYS.has(d));
  const hours = Math.round(Number(input.minHoursSinceLastPost));
  // Same floor as the settings field (the check only runs once a day); a
  // two-week ceiling keeps a typo from silencing reminders for months.
  if (!Number.isFinite(hours) || hours < 24 || hours > 24 * 14) {
    return { ok: false, message: "Please choose how long to wait before a reminder." };
  }
  if (input.enabled && checkDays.length === 0) {
    return { ok: false, message: "Please choose at least one day, or tap “Pause all reminders”." };
  }

  try {
    await payload.updateGlobal({
      slug: "reminder-settings",
      overrideAccess: false,
      user,
      data: { enabled: input.enabled, checkDays, minHoursSinceLastPost: hours } as never,
    });
    const schedule = { enabled: input.enabled, checkDays, minHoursSinceLastPost: hours };
    await logActivity(payload, {
      summary: input.enabled ? "Changed the posting reminder schedule" : "Paused posting reminders",
      area: "other",
      who: (user as { email?: string }).email,
    });
    return { ok: true, summary: describeSchedule(schedule) };
  } catch (err) {
    payload.logger.error(`[manage/reminders] ${err instanceof Error ? err.message : String(err)}`);
    await logActivity(payload, {
      summary: "Couldn't change the reminder schedule",
      status: "failed",
      area: "other",
      who: (user as { email?: string }).email,
    });
    return { ok: false, message: "Something went wrong, and nothing was changed. Please try again." };
  }
}
