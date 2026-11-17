import { requireManageUser } from "@/lib/manage/auth";
import { BUSINESS_TZ, businessToday } from "@/lib/businessDate";
import { Screen } from "@/components/manage/Screen";

export const dynamic = "force-dynamic";

type Entry = { id: string | number; summary: string; status: "success" | "failed" | "unknown"; who?: string | null; createdAt: string };

const MARK = { success: "✓", failed: "✗", unknown: "?" } as const;
const ROW_CLASS = { success: "m-dest--good", failed: "m-dest--bad", unknown: "m-dest--warn" } as const;

function dayLabel(date: Date): string {
  const day = businessToday(date);
  const today = businessToday();
  const yesterday = businessToday(new Date(Date.now() - 86_400_000));
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ });
}

export default async function RecentActivityPage() {
  const { payload, user } = await requireManageUser();
  const res = await payload.find({
    collection: "activity-log",
    overrideAccess: false,
    user,
    sort: "-createdAt",
    limit: 75,
    depth: 0,
  });
  const entries = res.docs as unknown as Entry[];

  const groups: { label: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const label = dayLabel(new Date(e.createdAt));
    if (groups.at(-1)?.label !== label) groups.push({ label, entries: [] });
    groups.at(-1)!.entries.push(e);
  }

  const whoText = (who?: string | null) =>
    !who ? "automatic" : who === (user as { email?: string }).email ? "you" : who.split("@")[0];

  return (
    <Screen
      title="Recent activity"
      intro="What's been posted and changed, newest first. A ✓ means it worked."
      back={{ href: "/manage", label: "Home" }}
    >
      {entries.length === 0 && <p className="m-notice">Nothing yet. Things you post and change will show up here.</p>}
      {groups.map((g) => (
        <section key={g.label}>
          <h2>{g.label}</h2>
          <ul className="m-dests">
            {g.entries.map((e) => (
              <li key={String(e.id)} className={`m-dest ${ROW_CLASS[e.status] ?? ""}`}>
                <span className="m-dest-mark" aria-label={e.status === "success" ? "Worked" : e.status === "failed" ? "Didn't work" : "Not sure yet"}>
                  {MARK[e.status] ?? "•"}
                </span>
                <span>
                  <strong>{e.summary}</strong>
                  <span className="m-activity-meta">
                    {new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TZ })} ·{" "}
                    {whoText(e.who)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {entries.length === res.limit && <p className="m-hint">Showing the most recent {res.limit}. Older activity is in the regular editor.</p>}
    </Screen>
  );
}
