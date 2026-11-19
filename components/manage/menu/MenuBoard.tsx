"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MenuItemView } from "@/lib/manage/menu";
import { setSoldOutToday } from "@/app/(manage)/manage/menu/actions";
import { UndoBar } from "@/components/manage/UndoBar";

const SECTIONS: { group: MenuItemView["group"]; label: string }[] = [
  { group: "main", label: "Main dishes" },
  { group: "extras", label: "Extras & drinks" },
];

export function MenuBoard({ items, changesWaiting }: { items: MenuItemView[]; changesWaiting: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "order">("list");
  const [soldOut, setSoldOut] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [String(i.id), i.soldOut])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  async function toggleSoldOut(item: MenuItemView) {
    const key = String(item.id);
    const next = !soldOut[key];
    setBusyId(key);
    setNotice(null);
    const r = await setSoldOutToday(item.id, next);
    setBusyId(null);
    if (r.ok) {
      setSoldOut((s) => ({ ...s, [key]: next }));
      setNotice({
        text: next
          ? `“${item.title}” now shows “Sold out today” on the website. It goes back to normal by itself tomorrow.`
          : `“${item.title}” is available again on the website.`,
      });
    } else {
      setNotice({ text: r.message, error: true });
    }
  }

  if (mode === "order") {
    return <OrderEditor items={items} onDone={() => (setMode("list"), router.refresh())} />;
  }

  return (
    <>
      {changesWaiting > 0 && (
        <div className="m-notice m-notice--warn">
          <p style={{ margin: "0 0 12px" }}>
            <strong>
              {changesWaiting === 1 ? "1 change is" : `${changesWaiting} changes are`} saved but not on the website yet.
            </strong>
          </p>
          <Link href="/manage/changes" className="m-btn m-btn--primary m-btn--block">
            Review and put on the website
          </Link>
        </div>
      )}

      {notice && (
        <div className={`m-notice ${notice.error ? "m-notice--error" : "m-notice--good"}`} role="status">
          {notice.text}
        </div>
      )}

      <Link href="/manage/menu/new" className="m-btn m-btn--block m-btn--tall" style={{ marginBottom: 8 }}>
        + Add a new item
      </Link>

      {SECTIONS.map(({ group, label }) => {
        const list = items.filter((i) => i.group === group);
        if (list.length === 0) return null;
        return (
          <section key={group}>
            <h2>{label}</h2>
            <ul className="m-cards">
              {list.map((item) => {
                const key = String(item.id);
                const isSoldOut = soldOut[key];
                return (
                  <li key={key} className="m-card">
                    <div className="m-card-top">
                      {item.image?.url && <img src={item.image.url} alt="" className="m-card-thumb" />}
                      <div>
                        <p className="m-card-title">{item.title}</p>
                        <p className="m-card-sub">{item.priceOptions.map((p) => `${p.label} ${p.price}`).join(" · ")}</p>
                        <p className="m-badges">
                          {item.status === "new" && <span className="m-badge m-badge--warn">Not on the website yet</span>}
                          {item.status === "changes" && <span className="m-badge m-badge--warn">Changes not on the website yet</span>}
                          {isSoldOut && <span className="m-badge m-badge--bad">Sold out today</span>}
                        </p>
                      </div>
                    </div>
                    <div className="m-card-actions">
                      <Link href={`/manage/menu/${item.id}`} className="m-btn">
                        ✏️ Change
                      </Link>
                      {item.status !== "new" && (
                        <button
                          type="button"
                          className={`m-btn ${isSoldOut ? "m-btn--soldout-on" : ""}`}
                          aria-pressed={isSoldOut}
                          disabled={busyId === key}
                          onClick={() => toggleSoldOut(item)}
                        >
                          {busyId === key ? "One moment…" : isSoldOut ? "✓ Sold out — tap when it's back" : "Mark sold out today"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="m-footer-actions m-stack">
        <button type="button" className="m-btn m-btn--block" onClick={() => setMode("order")}>
          ↕ Change the order
        </button>
        <Link href="/manage/menu/removed" className="m-btn m-btn--block">
          🗑 Recently removed
        </Link>
        <Link href="/manage/website/menu-intro" className="m-btn m-btn--block">
          ✏️ The menu&apos;s heading and notes at the bottom
        </Link>
      </div>
    </>
  );
}

// Move up / Move down instead of dragging. Nothing changes on the website
// until "Put this order on the website" — then it's live at once (with an
// Undo), using the same safe reorder endpoint /admin uses, which only ever
// touches each item's position and never its saved-but-waiting edits.
function OrderEditor({ items, onDone }: { items: MenuItemView[]; onDone: () => void }) {
  const original = items.map((i) => i.id);
  const [order, setOrder] = useState(items);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = order.some((item, i) => item.id !== original[i]);

  function move(id: MenuItemView["id"], dir: -1 | 1) {
    setOrder((list) => {
      const group = list.find((i) => i.id === id)!.group;
      const inGroup = list.filter((i) => i.group === group);
      const idx = inGroup.findIndex((i) => i.id === id);
      const swap = inGroup[idx + dir];
      if (!swap) return list;
      return list.map((i) => (i.id === id ? swap : i.id === swap.id ? inGroup[idx] : i));
    });
  }

  async function send(ids: (number | string)[]) {
    const res = await fetch("/api/reorder", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionSlug: "menu-items", items: ids.map((id, i) => ({ id, order: (i + 1) * 10 })) }),
    });
    return res.ok;
  }

  if (saved) {
    return (
      <>
        <UndoBar
          message="The new order is on the website."
          onUndo={async () => ((await send(original)) ? { ok: true } : { ok: false, message: "That couldn't be undone. Please try again." })}
        />
        <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={onDone}>
          Done
        </button>
      </>
    );
  }

  return (
    <>
      <p className="m-intro">Use the buttons to move items. Nothing changes on the website until you tap the button at the bottom.</p>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}
      {SECTIONS.map(({ group, label }) => {
        const list = order.filter((i) => i.group === group);
        if (list.length === 0) return null;
        return (
          <section key={group}>
            <h2>{label}</h2>
            <ol className="m-cards">
              {list.map((item, idx) => (
                <li key={String(item.id)} className="m-card m-order-row">
                  <span className="m-card-title">
                    {idx + 1}. {item.title}
                  </span>
                  <span className="m-order-buttons">
                    <button type="button" className="m-btn m-btn--small" disabled={idx === 0} onClick={() => move(item.id, -1)}>
                      ▲ Up
                    </button>
                    <button
                      type="button"
                      className="m-btn m-btn--small"
                      disabled={idx === list.length - 1}
                      onClick={() => move(item.id, 1)}
                    >
                      ▼ Down
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <div className="m-footer-actions m-stack">
        <button
          type="button"
          className="m-btn m-btn--primary m-btn--block"
          disabled={!changed || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const ok = await send(order.map((i) => i.id));
            setBusy(false);
            if (ok) setSaved(true);
            else setError("The new order couldn't be saved. Please try again.");
          }}
        >
          {busy ? "Saving…" : "Put this order on the website"}
        </button>
        <button type="button" className="m-btn m-btn--block" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </>
  );
}
