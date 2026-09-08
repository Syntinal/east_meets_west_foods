import type { GlobalConfig } from "payload";
import { authenticated } from "@/access/authenticated";

const DAY_OPTIONS = [
  { label: "Sunday", value: "sun" },
  { label: "Monday", value: "mon" },
  { label: "Tuesday", value: "tue" },
  { label: "Wednesday", value: "wed" },
  { label: "Thursday", value: "thu" },
  { label: "Friday", value: "fri" },
  { label: "Saturday", value: "sat" },
];

// Config for the "haven't posted in a while" push reminder — see
// app/(frontend)/next/cron/remind-post/route.ts (the actual sender, run
// daily by Vercel Cron) and components/admin/PushReminderButton.tsx (where
// a device opts in to receive it). Purely internal admin settings, no
// public read need — access is locked to authenticated on both read and
// update, unlike most Globals here which are publicly readable (this one
// has nothing to do with what a site visitor sees).
//
// No drafts/versions/Live Preview on this one (unlike Home/Sauce/etc.) —
// it's a plain settings toggle, not content with a preview-before-publish
// need, so it stays as simple as Navigation's own base shape.
export const ReminderSettings: GlobalConfig = {
  slug: "reminder-settings",
  access: {
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: "Site Settings",
    description:
      "When to remind whoever's enabled it (see the Quick Actions button on the dashboard) to create a new News post.",
  },
  fields: [
    {
      name: "enabled",
      type: "checkbox",
      label: "Send reminders",
      defaultValue: true,
      admin: { description: "Turn off to stop all reminder pushes without losing the schedule below." },
    },
    {
      name: "checkDays",
      type: "select",
      hasMany: true,
      label: "Days to check",
      options: DAY_OPTIONS,
      defaultValue: ["tue", "thu"],
      admin: {
        description:
          "The daily cron only actually sends on these days — picking none effectively pauses reminders the same as unchecking \"Send reminders\" above.",
      },
    },
    {
      name: "minHoursSinceLastPost",
      type: "number",
      label: "Remind if no post in the last (hours)",
      defaultValue: 48,
      // 24, not 1 — the check itself only ever runs once a day (see
      // `checkDays`'s own note), so any value under 24 would behave
      // identically to 24 anyway (the very next daily run is already
      // guaranteed to be at least ~24h after the last one) while looking
      // like it promises faster, sub-daily checking that doesn't exist.
      min: 24,
      admin: {
        description:
          "Compared against the most recent News post's creation time (draft or published — starting one counts as \"working on it\"). A checked day where this gap hasn't passed yet is silently skipped, no notification sent. Minimum is 24 since the check itself only runs once a day — see below.",
      },
    },
    {
      name: "message",
      type: "text",
      label: "Reminder text",
      defaultValue: "Haven't posted in a while — want to create a new post?",
      admin: { description: "The notification body text. Keep it short — this is what shows on the lock screen." },
    },
    {
      name: "lastCheckedAt",
      type: "date",
      label: "Last checked",
      admin: {
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
        description:
          "Written automatically every time the daily check runs — not editable here. Vercel runs it once a day, sometime within the same hour each time (not the exact minute), so this is the real record of when it last ran, not a promise of exactly when the next one will.",
      },
    },
    {
      name: "lastCheckSummary",
      type: "text",
      label: "Last check result",
      admin: { readOnly: true, description: "What that last check actually decided, in plain language." },
    },
  ],
};
