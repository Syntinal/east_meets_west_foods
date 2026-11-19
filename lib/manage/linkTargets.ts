import type { ManageSession, ManageUser } from "./auth";
import { NAV_PAGES } from "@/lib/navigation";

// The places a link in /manage can point to, in plain words: the site's own
// pages, calling the restaurant, or (typed in) another website. Used by the
// paragraph editor's "Make some words a link" and by button links.

export type LinkTarget = { label: string; url: string };

const FRIENDLY: Record<string, string> = {
  "/": "Home page",
  "/menu": "Menu page",
  "/sauce": "Our Sauce page",
  "/story": "Our Story page",
  "/news": "News page",
  "/testimonials": "Reviews page",
  "/faq": "Questions (FAQ) page",
  "/contact": "Contact page (map and directions)",
};

export function telHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return null;
}

export async function getLinkTargets(s: { payload: ManageSession["payload"]; user: ManageUser }): Promise<LinkTarget[]> {
  const [pages, contact] = await Promise.all([
    s.payload.find({
      collection: "pages",
      where: { _status: { equals: "published" } },
      sort: "title",
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user: s.user,
    }),
    s.payload.findGlobal({ slug: "contact", depth: 0, overrideAccess: false, user: s.user }),
  ]);
  const targets: LinkTarget[] = NAV_PAGES.map((p) => ({ label: FRIENDLY[p.href] ?? `${p.label} page`, url: p.href }));
  for (const d of pages.docs as unknown as { title?: string; slug?: string }[]) {
    if (d.title && d.slug) targets.push({ label: `${d.title} page`, url: `/${d.slug}` });
  }
  const phone = (contact as unknown as { phone?: string }).phone ?? "";
  const tel = telHref(phone);
  if (tel) targets.push({ label: `Call the restaurant — ${phone}`, url: tel });
  return targets;
}

/** A link's destination in plain words. */
export function describeLink(url: string, targets: LinkTarget[]): string {
  const known = targets.find((t) => t.url === url);
  if (known) return known.label;
  if (url.startsWith("tel:")) return `Call ${url.slice(4)}`;
  if (url.startsWith("mailto:")) return `Email ${url.slice(7)}`;
  if (/^https?:\/\//i.test(url)) return `Another website: ${url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}`;
  return url;
}
