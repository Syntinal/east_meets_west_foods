"use client";

import { useState } from "react";

export type PreviewItem = { id: string; label: string; badge?: string; previewUrl: string; editHref: string };

// The interactive half of the split list+preview view (see
// ListPreviewView.tsx, the server component that computes `items` and
// registers this as a collection's `views.list.Component`). Left: the item
// list — clicking a row just swaps which precomputed preview URL is
// active, no navigation. Right: an iframe on that URL — the iframe does
// its own navigation through /next/preview (sets the draft-mode +
// live-preview-id cookie, same mechanism components/menu/LiveMenuGrid.tsx
// already relies on) without reloading this view around it. "Edit →"
// leaves this view entirely for Payload's real, already-working Edit view
// (which has its own live-updating form/preview split) — this component
// deliberately doesn't try to reproduce that inline; see the plan doc for
// why.
export function ListPreviewSplit({
  items,
  defaultPreviewUrl,
  createHref,
  createLabel,
}: {
  items: PreviewItem[];
  defaultPreviewUrl: string;
  createHref: string;
  createLabel: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = items.find((item) => item.id === selectedId);
  const iframeSrc = selected?.previewUrl ?? defaultPreviewUrl;

  return (
    <div style={{ display: "flex", gap: 16, height: "70vh", minHeight: 480 }}>
      <div
        style={{
          width: 320,
          flexShrink: 0,
          overflowY: "auto",
          border: "1px solid var(--theme-elevation-150, #ddd)",
          borderRadius: 4,
        }}
      >
        <a
          href={createHref}
          className="btn btn--style-primary"
          style={{ display: "block", margin: 12, textAlign: "center" }}
        >
          + New {createLabel}
        </a>
        {items.length === 0 && <p style={{ padding: "0 12px", opacity: 0.7, fontSize: 13 }}>Nothing here yet.</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                borderTop: "1px solid var(--theme-elevation-100, #eee)",
                background: item.id === selectedId ? "var(--theme-elevation-50, #f5f5f5)" : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px 2px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                {item.label}
                {item.badge && (
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      opacity: 0.65,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      marginTop: 2,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
              <a href={item.editHref} style={{ display: "block", padding: "0 12px 10px", fontSize: 12, opacity: 0.75 }}>
                Edit →
              </a>
            </li>
          ))}
        </ul>
      </div>
      <iframe
        src={iframeSrc}
        title="Page preview"
        style={{ flex: 1, border: "1px solid var(--theme-elevation-150, #ddd)", borderRadius: 4 }}
      />
    </div>
  );
}
