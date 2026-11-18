// The "haven't posted in a while" reminder schedule (globals/ReminderSettings.ts)
// in plain words, plus the simple choices /manage offers for changing it.
// Pure functions — used by both the Reminders page (server) and its form (client).

export const DAYS = [
  { value: "mon", short: "Mon", plural: "Mondays" },
  { value: "tue", short: "Tue", plural: "Tuesdays" },
  { value: "wed", short: "Wed", plural: "Wednesdays" },
  { value: "thu", short: "Thu", plural: "Thursdays" },
  { value: "fri", short: "Fri", plural: "Fridays" },
  { value: "sat", short: "Sat", plural: "Saturdays" },
  { value: "sun", short: "Sun", plural: "Sundays" },
] as const;

export const GAP_CHOICES = [
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "1 week" },
] as const;

export type ReminderSchedule = { enabled: boolean; checkDays: string[]; minHoursSinceLastPost: number };

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** For the sentence "if nothing has been posted in the last ___". */
export function gapInWords(hours: number): string {
  if (hours === 168) return "week";
  if (hours === 24) return "day";
  if (hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} hours`;
}

export function describeSchedule(s: ReminderSchedule): string {
  const days = DAYS.filter((d) => s.checkDays.includes(d.value)).map((d) => d.plural);
  if (!s.enabled || days.length === 0) return "Reminders are paused right now. You won't get any until you turn them back on below.";
  const when = days.length === 7 ? "Every morning" : `On ${joinWords(days)} in the morning`;
  return `${when}, if nothing has been posted in the last ${gapInWords(s.minHoursSinceLastPost)}, you'll get a reminder. Tapping it takes you straight to making a post.`;
}
