// The restaurant's "master" business info — name, phone, address, regular
// hours and holiday / one-off days — as stored in globals/BusinessInfo.ts.
// This is the ONE place those facts live: the website (Contact page,
// footer, Store Hours block, search-engine JSON-LD) reads it, and
// lib/businessSync/* pushes it to Google and Facebook.
//
// Pure functions only (no Payload import), so client components can use the
// formatting helpers too. Server-side fetching is lib/businessInfoServer.ts.

export const WEEKDAYS = [
  { key: "monday", short: "Mon", label: "Monday", google: "MONDAY", fb: "mon", schema: "https://schema.org/Monday" },
  { key: "tuesday", short: "Tue", label: "Tuesday", google: "TUESDAY", fb: "tue", schema: "https://schema.org/Tuesday" },
  { key: "wednesday", short: "Wed", label: "Wednesday", google: "WEDNESDAY", fb: "wed", schema: "https://schema.org/Wednesday" },
  { key: "thursday", short: "Thu", label: "Thursday", google: "THURSDAY", fb: "thu", schema: "https://schema.org/Thursday" },
  { key: "friday", short: "Fri", label: "Friday", google: "FRIDAY", fb: "fri", schema: "https://schema.org/Friday" },
  { key: "saturday", short: "Sat", label: "Saturday", google: "SATURDAY", fb: "sat", schema: "https://schema.org/Saturday" },
  { key: "sunday", short: "Sun", label: "Sunday", google: "SUNDAY", fb: "sun", schema: "https://schema.org/Sunday" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

/** One day's hours. Times are 24-hour "HH:MM"; "24:00" means midnight at the end of the day. */
export type DayHours = { open: boolean; opensAt: string; closesAt: string };

/** A holiday or one-off day. `date` is the restaurant's calendar day, YYYY-MM-DD. */
export type SpecialDay = { date: string; label: string; closed: boolean; opensAt: string; closesAt: string };

export type BusinessInfo = {
  name: string;
  phone: string;
  address: { street: string; suite: string; city: string; state: string; zip: string };
  hours: Record<WeekdayKey, DayHours>;
  specialDays: SpecialDay[];
};

// What the site showed before this record existed (the old hardcoded
// lib/structuredData.ts values + the Store Hours page as of Nov 2026). Used
// as field defaults and as a fallback if the record is ever unreadable, so
// the site never renders with a blank address.
export const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: "East Meets West Dumplings Bar",
  phone: "(208) 627-6283",
  address: { street: "476534 US HWY 95", suite: "Suite B", city: "Ponderay", state: "ID", zip: "83852" },
  hours: {
    monday: { open: true, opensAt: "12:00", closesAt: "18:00" },
    tuesday: { open: false, opensAt: "12:00", closesAt: "18:00" },
    wednesday: { open: true, opensAt: "12:00", closesAt: "18:00" },
    thursday: { open: true, opensAt: "12:00", closesAt: "18:00" },
    friday: { open: true, opensAt: "12:00", closesAt: "18:00" },
    saturday: { open: true, opensAt: "12:00", closesAt: "18:00" },
    sunday: { open: false, opensAt: "12:00", closesAt: "18:00" },
  },
  specialDays: [],
};

/** Half-hour choices from 6am to midnight, as {value: "HH:MM", label: "6:30am"}. */
export const TIME_CHOICES: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let m = 6 * 60; m <= 24 * 60; m += 30) {
    const value = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    out.push({ value, label: timeLabel(value) });
  }
  return out;
})();

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
export const isValidTime = (t: unknown): t is string => typeof t === "string" && TIME_RE.test(t);
export const isValidDate = (d: unknown): d is string =>
  typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T12:00:00Z`).getTime());

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** "12:00" → "12pm", "18:30" → "6:30pm", "24:00" → "midnight". */
export function timeLabel(t: string): string {
  if (t === "24:00" || t === "00:00") return "midnight";
  const h = Number(t.slice(0, 2));
  const m = t.slice(3, 5);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m === "00" ? "" : `:${m}`}${suffix}`;
}

/** "12pm – 6pm", or "Closed". */
export function hoursLabel(isOpen: boolean, opensAt: string, closesAt: string): string {
  return isOpen ? `${timeLabel(opensAt)} – ${timeLabel(closesAt)}` : "Closed";
}

export const dayHoursLabel = (h: DayHours) => hoursLabel(h.open, h.opensAt, h.closesAt);
export const specialDayHoursLabel = (s: SpecialDay) => hoursLabel(!s.closed, s.opensAt, s.closesAt);

/** "Thursday, November 26" for a YYYY-MM-DD restaurant day. */
export function dateLabel(date: string, opts: { year?: boolean } = {}): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(opts.year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function streetLine(a: BusinessInfo["address"]): string {
  return [a.street, a.suite].filter(Boolean).join(", ");
}

/** "476534 US HWY 95, Suite B\nPonderay, ID 83852" */
export function addressLines(a: BusinessInfo["address"]): string[] {
  return [streetLine(a), `${a.city}, ${a.state} ${a.zip}`.trim()].filter((l) => l && l !== ",");
}

export const addressOneLine = (a: BusinessInfo["address"]) => addressLines(a).join(", ");

export function mapsSearchUrl(a: BusinessInfo["address"]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressOneLine(a))}`;
}

export function mapsEmbedUrl(a: BusinessInfo["address"]): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(addressOneLine(a))}&z=15&output=embed`;
}

export const phoneDigits = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};

export function telHref(phone: string): string {
  const d = phoneDigits(phone);
  return d.length === 10 ? `tel:+1${d}` : `tel:${d}`;
}

/** "+1-208-627-6283" (schema.org) / "+12086276283" (E.164, Google). */
export function phoneE164(phone: string): string {
  const d = phoneDigits(phone);
  return d.length === 10 ? `+1${d}` : `+${d}`;
}

export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== "string" || !phone.trim()) return false;
  return phoneDigits(phone).length === 10;
}

/** Special days from `today` (YYYY-MM-DD) onward, soonest first. */
export function upcomingSpecialDays(info: BusinessInfo, today: string): SpecialDay[] {
  return info.specialDays.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Turns whatever is stored (possibly partial, possibly from an older shape)
 * into a complete BusinessInfo, filling gaps from the defaults.
 */
export function normalizeBusinessInfo(raw: unknown): BusinessInfo {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_BUSINESS_INFO;
  const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
  const addr = (r.address && typeof r.address === "object" ? r.address : {}) as Record<string, unknown>;
  const hoursRaw = (r.hours && typeof r.hours === "object" ? r.hours : {}) as Record<string, unknown>;
  const hours = {} as Record<WeekdayKey, DayHours>;
  for (const day of WEEKDAYS) {
    const h = (hoursRaw[day.key] && typeof hoursRaw[day.key] === "object" ? hoursRaw[day.key] : {}) as Record<string, unknown>;
    const def = d.hours[day.key];
    hours[day.key] = {
      open: typeof h.open === "boolean" ? h.open : def.open,
      opensAt: isValidTime(h.opensAt) ? h.opensAt : def.opensAt,
      closesAt: isValidTime(h.closesAt) ? h.closesAt : def.closesAt,
    };
  }
  const specialDays: SpecialDay[] = (Array.isArray(r.specialDays) ? r.specialDays : [])
    .map((s: Record<string, unknown>) => ({
      date: typeof s?.date === "string" ? s.date : "",
      label: typeof s?.label === "string" ? s.label.trim() : "",
      closed: s?.closed !== false,
      opensAt: isValidTime(s?.opensAt) ? (s.opensAt as string) : "12:00",
      closesAt: isValidTime(s?.closesAt) ? (s.closesAt as string) : "18:00",
    }))
    .filter((s) => isValidDate(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    name: str(r.name, d.name),
    phone: str(r.phone, d.phone),
    address: {
      street: str(addr.street, d.address.street),
      // Suite may be deliberately blank, so only fall back when it's missing entirely.
      suite: typeof addr.suite === "string" ? addr.suite.trim() : d.address.suite,
      city: str(addr.city, d.address.city),
      state: str(addr.state, d.address.state),
      zip: str(addr.zip, d.address.zip),
    },
    hours,
    specialDays,
  };
}

/** Problems that should stop a save, in plain words. Empty when it's fine. */
export function validateBusinessInfo(info: BusinessInfo): string[] {
  const problems: string[] = [];
  if (!isValidPhone(info.phone)) problems.push('The phone number needs all 10 digits, like "(208) 627-6283".');
  if (!info.address.street) problems.push("Please fill in the street address.");
  if (!info.address.city || !info.address.state || !/^\d{5}(-\d{4})?$/.test(info.address.zip)) {
    problems.push("Please fill in the town, state and 5-digit ZIP code.");
  }
  for (const day of WEEKDAYS) {
    const h = info.hours[day.key];
    if (h.open && toMinutes(h.closesAt) <= toMinutes(h.opensAt)) {
      problems.push(`${day.label}: the closing time has to be after the opening time.`);
    }
  }
  const seen = new Set<string>();
  for (const s of info.specialDays) {
    if (seen.has(s.date)) problems.push(`${dateLabel(s.date)} is listed twice. Please keep just one.`);
    seen.add(s.date);
    if (!s.closed && toMinutes(s.closesAt) <= toMinutes(s.opensAt)) {
      problems.push(`${dateLabel(s.date)}: the closing time has to be after the opening time.`);
    }
  }
  return problems;
}

// ---------- "Is this place up to date?" fingerprints ----------
//
// Each place the info goes (Google, Facebook, Yelp…) remembers the
// fingerprint of what it was last given. When the current fingerprint
// differs, that place needs updating. Scopes exist because not every place
// shows everything: Instagram only shows phone + address, and Facebook's
// holiday hours have to be entered by hand even when its regular hours sync.

export type FingerprintScope = "all" | "contact" | "regular" | "special";

function stableHash(s: string): string {
  // FNV-1a, 32-bit. Not security-sensitive — only "did anything change".
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function fingerprint(info: BusinessInfo, scope: FingerprintScope = "all", today?: string): string {
  const contact = { name: info.name, phone: phoneDigits(info.phone), address: info.address };
  const regular = WEEKDAYS.map((d) => {
    const h = info.hours[d.key];
    return h.open ? `${d.key}:${h.opensAt}-${h.closesAt}` : `${d.key}:closed`;
  });
  // Past holidays don't matter to anyone, so they never make a place look out of date.
  const special = (today ? upcomingSpecialDays(info, today) : info.specialDays).map((s) =>
    s.closed ? `${s.date}:closed` : `${s.date}:${s.opensAt}-${s.closesAt}`,
  );
  const parts =
    scope === "contact"
      ? { contact }
      : scope === "regular"
        ? { contact, regular }
        : scope === "special"
          ? { special }
          : { contact, regular, special };
  return stableHash(JSON.stringify(parts));
}

// ---------- Search engines (schema.org JSON-LD) ----------

const STATIC_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "LocalBusiness"],
  description:
    "Authentic Northern Chinese dumplings, bao buns, and homemade garlic sauce at fast-food prices, served in Ponderay, Idaho.",
  url: "https://eastmeetswestfoods.co/",
  image: "https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg",
  servesCuisine: ["Chinese", "Northern Chinese", "Dumplings"],
  priceRange: "$",
  areaServed: [
    { "@type": "City", name: "Sandpoint", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "City", name: "Ponderay", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "AdministrativeArea", name: "Bonner County" },
    { "@type": "City", name: "Kootenai", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "City", name: "Sagle", containedInPlace: { "@type": "State", name: "Idaho" } },
  ],
};

// schema.org wants "23:59" style times; it has no "24:00".
const schemaTime = (t: string) => (t === "24:00" ? "23:59" : t);

export function buildRestaurantSchema(info: BusinessInfo, today: string): Record<string, unknown> {
  const d = phoneDigits(info.phone);
  return {
    ...STATIC_SCHEMA,
    name: info.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: streetLine(info.address),
      addressLocality: info.address.city,
      addressRegion: info.address.state,
      postalCode: info.address.zip,
      addressCountry: "US",
    },
    // Coordinates stay fixed: they'd need geocoding to follow an address
    // change, and Google reads the address itself anyway.
    geo: { "@type": "GeoCoordinates", latitude: 48.305, longitude: -116.534 },
    telephone: d.length === 10 ? `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : info.phone,
    openingHoursSpecification: WEEKDAYS.filter((day) => info.hours[day.key].open).map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day.schema,
      opens: info.hours[day.key].opensAt,
      closes: schemaTime(info.hours[day.key].closesAt),
    })),
    ...(upcomingSpecialDays(info, today).length > 0 && {
      specialOpeningHoursSpecification: upcomingSpecialDays(info, today).map((s) => ({
        "@type": "OpeningHoursSpecification",
        validFrom: s.date,
        validThrough: s.date,
        // schema.org's convention for "closed all day" is 00:00–00:00.
        opens: s.closed ? "00:00" : s.opensAt,
        closes: s.closed ? "00:00" : schemaTime(s.closesAt),
      })),
    }),
  };
}
