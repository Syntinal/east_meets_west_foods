"use client";

import { useEffect, useState } from "react";

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
//
// Reordering (`reorderable`): Menu Items previously had no way to reorder
// except typing numbers into its `order` field (see collections/MenuItems.ts)
// — every array field on this site (gallery photos, FAQ questions, page
// blocks) already gets real drag handles for free from Payload's own array
// UI, so this was a real inconsistency for a non-technical owner. Payload
// does have a native drag-reorder feature (`orderable` at the collection
// level), but it's still marked experimental in this Payload version and
// its drag UI lives entirely inside Payload's *own* List view rendering —
// which this component already fully replaces — so adopting it here would
// mean depending on an experimental, still-changing internal endpoint
// instead of this collection's own simple, stable `order` number field.
// This implements drag-and-drop directly against that existing field
// instead: dropping a row renumbers the whole list by 10s (0, 10, 20, ...)
// and persists it via the dedicated /api/reorder route (see its header
// comment) — the exact same field an "Edit →" visit or a future admin
// still edits directly, so nothing about how ordering works elsewhere on
// this collection changes, just how it's triggered from this screen.
// Deliberately NOT a plain `PATCH /api/<collection>/<id>` — that endpoint
// merges onto the document's latest saved version (draft or published),
// which can silently drag a pending draft's stale content/status into the
// live row on a simple reorder; see /api/reorder/route.ts for the full
// incident and fix.
export function ListPreviewSplit({
  items,
  defaultPreviewUrl,
  createHref,
  createLabel,
  reorderable,
  collectionSlug,
}: {
  items: PreviewItem[];
  defaultPreviewUrl: string;
  createHref: string;
  createLabel: string;
  // Only set together — see collections/MenuItems.ts for the one
  // collection currently opted in. The order field's actual name lives
  // server-side in app/(payload)/api/reorder/route.ts's own allowlist, not
  // here — this component only ever needs to know *whether* to show drag
  // handles, not which column they map to.
  reorderable?: boolean;
  collectionSlug?: string;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Keeps this in sync if the server-rendered `items` prop ever changes
  // out from under it (e.g. returning to this list after editing an item
  // elsewhere) — compared by id sequence rather than replaced
  // unconditionally, so an in-flight local reorder (see below) isn't
  // clobbered by the exact same list re-rendering.
  useEffect(() => {
    setOrderedItems((current) => {
      const sameIds = current.length === items.length && current.every((item, i) => item.id === items[i].id);
      return sameIds ? current : items;
    });
  }, [items]);

  const selected = orderedItems.find((item) => item.id === selectedId);
  const iframeSrc = selected?.previewUrl ?? defaultPreviewUrl;

  async function persistOrder(next: PreviewItem[]) {
    if (!collectionSlug) return;
    setSavingOrder(true);
    try {
      // Goes through the dedicated /api/reorder route, NOT Payload's own
      // generated `PATCH /api/<collection>/<id>` endpoint — that endpoint
      // merges a partial update onto the document's latest saved version
      // (draft or published), so if an item has a pending unpublished
      // draft sitting on top, an order-only PATCH there would silently
      // drag that draft's stale content and status into the live row. See
      // app/(payload)/api/reorder/route.ts's header comment for the full
      // mechanism and CLAUDE.md for the incident that surfaced it.
      const res = await fetch("/api/reorder", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionSlug,
          items: next.map((item, index) => ({ id: item.id, order: index * 10 })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save the new order.");
      }
    } catch (err) {
      alert(
        `Couldn't save the new order — your changes weren't kept, sorry. Try again in a moment.\n\n(${
          err instanceof Error ? err.message : String(err)
        })`
      );
      setOrderedItems(items); // revert to the last known-good order
    } finally {
      setSavingOrder(false);
    }
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const fromIndex = orderedItems.findIndex((item) => item.id === draggingId);
    const toIndex = orderedItems.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    const next = [...orderedItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedItems(next);
    setDraggingId(null);
    void persistOrder(next);
  }

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
        {orderedItems.length === 0 && <p style={{ padding: "0 12px", opacity: 0.7, fontSize: 13 }}>Nothing here yet.</p>}
        {reorderable && orderedItems.length > 1 && (
          <p style={{ padding: "0 12px 8px", opacity: 0.65, fontSize: 12 }}>
            Drag <span aria-hidden>⠿</span> to reorder{savingOrder ? " — saving…" : "."}
          </p>
        )}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {orderedItems.map((item) => {
            const canDrag = Boolean(reorderable && collectionSlug && orderedItems.length > 1);
            return (
              <li
                key={item.id}
                draggable={canDrag}
                onDragStart={canDrag ? () => setDraggingId(item.id) : undefined}
                onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
                onDrop={canDrag ? () => handleDrop(item.id) : undefined}
                onDragEnd={canDrag ? () => setDraggingId(null) : undefined}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderTop: "1px solid var(--theme-elevation-100, #eee)",
                  background: item.id === selectedId ? "var(--theme-elevation-50, #f5f5f5)" : undefined,
                  opacity: draggingId === item.id ? 0.5 : 1,
                }}
              >
                {canDrag && (
                  <span
                    aria-hidden
                    title="Drag to reorder"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0 4px 0 10px",
                      cursor: "grab",
                      opacity: 0.55,
                      fontSize: 14,
                    }}
                  >
                    ⠿
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: canDrag ? "10px 12px 2px 0" : "10px 12px 2px",
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
                  <a
                    href={item.editHref}
                    style={{ display: "block", padding: canDrag ? "0 12px 10px 0" : "0 12px 10px", fontSize: 12, opacity: 0.75 }}
                  >
                    Edit →
                  </a>
                </div>
              </li>
            );
          })}
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
