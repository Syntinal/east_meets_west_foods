"use client";

import Link from "next/link";
import { useState } from "react";
import { restoreMenuItem } from "@/app/(manage)/manage/menu/actions";

type Removed = { id: number | string; title: string; removedAt: string };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });

export function RemovedList({ items }: { items: Removed[] }) {
  const [restored, setRestored] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return <p className="m-notice">Nothing has been removed.</p>;

  return (
    <>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}
      <ul className="m-cards">
        {items.map((item) => {
          const key = String(item.id);
          return (
            <li key={key} className="m-card">
              <p className="m-card-title">{item.title}</p>
              <p className="m-card-sub">Removed {when(item.removedAt)}</p>
              {restored[key] ? (
                <p className="m-badges">
                  <span className="m-badge m-badge--good">✓ Back on the menu</span>
                </p>
              ) : (
                <button
                  type="button"
                  className="m-btn m-btn--block"
                  disabled={busy === key}
                  onClick={async () => {
                    setBusy(key);
                    setError(null);
                    const r = await restoreMenuItem(item.id);
                    setBusy(null);
                    if (r.ok) setRestored((s) => ({ ...s, [key]: true }));
                    else setError(r.message);
                  }}
                >
                  {busy === key ? "One moment…" : "↶ Bring it back"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/manage/menu" className="m-btn m-btn--block" style={{ marginTop: 24 }}>
        Back to the menu
      </Link>
    </>
  );
}
