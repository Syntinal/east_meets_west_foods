"use client";

import Link from "next/link";
import { useState } from "react";
import { restoreMenuItem } from "@/app/(manage)/manage/menu/actions";

type Removed = { id: number | string; title: string; removedAt: string };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });

// Used for menu items and for posts. `restore` is a server action, handed in
// by the page (menu items by default).
export function RemovedList({
  items,
  restore = restoreMenuItem,
  restoredText = "✓ Back on the menu",
  emptyText = "Nothing has been removed.",
  back = { href: "/manage/menu", label: "Back to the menu" },
}: {
  items: Removed[];
  restore?: (id: number | string) => Promise<{ ok: true } | { ok: false; message: string }>;
  restoredText?: string;
  emptyText?: string;
  back?: { href: string; label: string };
}) {
  const [restored, setRestored] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0)
    return (
      <>
        <p className="m-notice">{emptyText}</p>
        <Link href={back.href} className="m-btn m-btn--block" style={{ marginTop: 24 }}>
          {back.label}
        </Link>
      </>
    );

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
                  <span className="m-badge m-badge--good">{restoredText}</span>
                </p>
              ) : (
                <button
                  type="button"
                  className="m-btn m-btn--block"
                  disabled={busy === key}
                  onClick={async () => {
                    setBusy(key);
                    setError(null);
                    const r = await restore(item.id);
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
      <Link href={back.href} className="m-btn m-btn--block" style={{ marginTop: 24 }}>
        {back.label}
      </Link>
    </>
  );
}
