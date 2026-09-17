import type { CSSProperties } from "react";
import type { Payload } from "payload";
import { PushReminderButton } from "@/components/admin/PushReminderButton";

// The dashboard's actual "what do I do right now" surface — rendered via
// `beforeDashboard` in payload.config.ts, above GettingStarted's own
// step-by-step guide. Built after the owner asked directly what the
// dashboard's main content area should show: Payload's own default
// dashboard (ModularDashboard, @payloadcms/next) ships with NO widgets
// configured here (`admin.dashboard` is unset in payload.config.ts, so
// `defaultLayout` defaults to an empty array — confirmed by reading
// getDefaultLayoutServerFn.js) — meaning that area was rendering
// essentially blank the whole time, not a "Site Settings" grid or anything
// else. This fills it with the two real, named-most-frequent actions
// (posting News, editing the Menu) as prominent buttons, then every other
// site page as a plain link row — same page list as SitePagesNav.tsx's
// sidebar section, just presented as "go do the thing" instead of
// navigation. Deliberately doesn't touch Site Settings (Users/Media/Media
// Assets/Pages/Navigation) at all — those are already one click away for
// anyone who needs them and aren't part of "what am I here to do most
// days."
//
// Same "receives `payload` via beforeDashboard's serverProps" mechanism
// SitePagesNav.tsx relies on for `beforeNavLinks` — confirmed via
// @payloadcms/next/dist/views/Dashboard/Default/index.js, which passes the
// same serverProps object (i18n/locale/params/payload/permissions/
// searchParams/user) to both slots.
//
// The primary/secondary buttons below hand-replicate Payload's real
// `Button` component's exact class list and inner `btn__content`/
// `btn__label` markup (@payloadcms/ui/dist/elements/Button/index.js)
// rather than importing it directly — Button is `'use client'` (it tracks
// its own tooltip-hover state), and this component needs to stay a plain
// server component to receive `payload` and query published Pages the
// same way SitePagesNav does. Hand-typing the classes risked the exact
// "missing btn--size-medium" gotcha CLAUDE.md documents from an earlier
// session (Button defaults `size` to `'medium'`, which is what actually
// supplies the button's padding — confirmed by reading the same Button
// source this time instead of guessing) — included explicitly here to
// avoid repeating it.
const FIXED_PAGES = [
  { label: "Home", href: "/admin/globals/home" },
  { label: "The Sauce", href: "/admin/globals/sauce" },
  { label: "Our Story", href: "/admin/globals/story" },
  { label: "Testimonials", href: "/admin/collections/testimonials" },
  { label: "FAQ", href: "/admin/globals/faq" },
  { label: "Contact", href: "/admin/globals/contact" },
];

const boxStyle: CSSProperties = {
  border: "1px solid var(--theme-elevation-150, #ddd)",
  borderRadius: 4,
  padding: 20,
  marginBottom: 24,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const restRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 16px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

function buttonHref(href: string, label: string, style: "primary" | "secondary") {
  return (
    <a key={href} href={href} className={`btn btn--style-${style} btn--size-medium`}>
      <span className="btn__content">
        <span className="btn__label">{label}</span>
      </span>
    </a>
  );
}

type PageDoc = {
  id: string | number;
  title?: string | null;
  navigation?: { navLabel?: string | null } | null;
};

export async function QuickActions({ payload }: { payload: Payload }) {
  // Published only — same reasoning as SitePagesNav.tsx: this mirrors what
  // a visitor can actually see live, and a draft-only Page's own edit link
  // is still reachable via Site Settings' plain "Pages" list either way.
  const { docs } = await payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  const dynamicPages = (docs as PageDoc[]).map((doc) => ({
    label: doc.navigation?.navLabel || doc.title || "Untitled",
    href: `/admin/collections/pages/${doc.id}`,
  }));

  // Surfaces right where the Enable button is, not just on the Reminder
  // Settings page — answers "is this actually running, and when" without
  // a click. Property access + primitive cast (not casting the whole
  // `settings` object to a shape with required fields) — confirmed safe
  // against the payload-types.ts-absent gotcha the same way the cron
  // route's own `checkDays`/`message` reads already are.
  const settings = await payload.findGlobal({ slug: "reminder-settings", overrideAccess: true });
  const lastCheckedAt = settings.lastCheckedAt as string | undefined;
  const lastCheckSummary = settings.lastCheckSummary as string | undefined;
  const lastChecked = lastCheckedAt
    ? new Date(lastCheckedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) +
      " UTC"
    : null;

  return (
    <div style={boxStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Quick actions</h3>
      <div style={actionRowStyle}>
        {buttonHref("/admin/collections/news-posts/create", "+ New News Post", "secondary")}
        {buttonHref("/admin/collections/menu-items", "Edit Menu", "secondary")}
      </div>
      <p style={{ opacity: 0.65, fontSize: 13, marginBottom: 8 }}>Every other page:</p>
      <ul style={restRowStyle}>
        {[...FIXED_PAGES, ...dynamicPages].map((page) => (
          <li key={page.href}>
            <a href={page.href}>{page.label}</a>
          </li>
        ))}
      </ul>
      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--theme-elevation-100, #eee)" }} />
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Post reminders</h3>
      <p style={{ opacity: 0.65, fontSize: 13, marginBottom: 4 }}>
        Get a phone notification when it&apos;s been a while since the last News post — set up once per device below.
        Schedule/wording: <a href="/admin/globals/reminder-settings">Reminder Settings</a>.
      </p>
      <p style={{ opacity: 0.65, fontSize: 13, marginBottom: 12 }}>
        {lastChecked
          ? `Last checked: ${lastChecked} — ${lastCheckSummary || "…"}`
          : "Not checked yet — runs once a day, so the first check happens within 24h of this being set up."}
      </p>
      {/* Client component — the rest of this dashboard section stays a
          plain server component (see the header comment) so it can query
          `payload` directly; only the notification/service-worker
          subscribe flow needs the browser. */}
      <PushReminderButton />
    </div>
  );
}
