// The restaurant's own calendar day (Ponderay/Sandpoint, ID). Servers run in
// UTC, which would flip "today" to "tomorrow" every evening Pacific time.
export const BUSINESS_TZ = "America/Los_Angeles";

/** Today's date at the restaurant, as YYYY-MM-DD. */
export function businessToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(now);
}

/** YYYY-MM-DD plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The instant the restaurant's day `date` (YYYY-MM-DD) begins — midnight Pacific, as an ISO string. */
export function businessMidnight(date: string): string {
  for (const h of [7, 8]) {
    const inst = new Date(`${date}T0${h}:00:00.000Z`);
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "2-digit", hourCycle: "h23" }).format(inst);
    if (businessToday(inst) === date && hour === "00") return inst.toISOString();
  }
  return `${date}T08:00:00.000Z`;
}
