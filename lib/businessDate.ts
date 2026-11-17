// The restaurant's own calendar day (Ponderay/Sandpoint, ID). Servers run in
// UTC, which would flip "today" to "tomorrow" every evening Pacific time.
export const BUSINESS_TZ = "America/Los_Angeles";

/** Today's date at the restaurant, as YYYY-MM-DD. */
export function businessToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(now);
}
