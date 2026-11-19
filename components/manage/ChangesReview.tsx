"use client";

import Link from "next/link";
import { useState } from "react";
import type { MenuChange, MenuItemView } from "@/lib/manage/menu";
import type { UndoToken } from "@/lib/manage/menuOps";
import type { PageChange, PageUndo } from "@/lib/manage/websiteOps";
import {
  discardMenuChanges,
  publishMenuItem,
  publishMenuItems,
  removeMenuItem,
  undoMenuChange,
} from "@/app/(manage)/manage/menu/actions";
import { discardPageChanges, publishPage, publishPages, undoPageChange } from "@/app/(manage)/manage/website/actions";
import { UndoBar } from "@/components/manage/UndoBar";

type Item = { type: "menu"; key: string; title: string; change: MenuChange } | { type: "page"; key: string; title: string; change: PageChange };

type Done =
  | { kind: "published"; undo: (() => Promise<{ ok: boolean; message?: string }>) | undefined }
  | { kind: "bulk" }
  | { kind: "discarded" }
  | { kind: "removed" };

type R = { ok: true } | { ok: false; message: string };

// "Changes not on the website yet": every saved change — menu items and
// website pages — shown with what changed and a preview, each with its own
// "Put on website". "Put all on the website" is at the very bottom and asks
// once more, listing exactly what will go live, so nothing unfinished goes
// up by accident.
export function ChangesReview({ menuChanges, pageChanges }: { menuChanges: MenuChange[]; pageChanges: PageChange[] }) {
  const items: Item[] = [
    ...pageChanges.map((c) => ({ type: "page" as const, key: `page-${c.slug}`, title: c.title, change: c })),
    ...menuChanges.map((c) => ({ type: "menu" as const, key: `menu-${c.id}`, title: c.title, change: c })),
  ];
  const [done, setDone] = useState<Record<string, Done>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const waiting = items.filter((i) => !done[i.key]);

  async function run(item: Item, fn: () => Promise<R & Record<string, unknown>>, toDone: (r: Record<string, unknown>) => Done) {
    setBusy(item.key);
    setError(null);
    const r = await fn();
    setBusy(null);
    if (r.ok) setDone((d) => ({ ...d, [item.key]: toDone(r) }));
    else setError(r.message);
  }

  function publish(item: Item) {
    if (item.type === "menu") {
      return run(item, () => publishMenuItem(item.change.id), (r) => {
        const undo = r.undo as UndoToken | null;
        return { kind: "published", undo: undo ? () => undoMenuChange(undo) : undefined };
      });
    }
    return run(item, () => publishPage(item.change.slug), (r) => {
      const undo = r.undo as PageUndo | null;
      return { kind: "published", undo: undo ? () => undoPageChange(undo) : undefined };
    });
  }

  if (items.length === 0) {
    return (
      <>
        <p className="m-notice m-notice--good">Everything you&apos;ve saved is on the website. ✓</p>
        <Link href="/manage" className="m-btn m-btn--block">
          Back to home
        </Link>
      </>
    );
  }

  return (
    <>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}
      <ul className="m-cards">
        {items.map((item) => {
          const d = done[item.key];
          const isNewMenuItem = item.type === "menu" && item.change.isNew;
          return (
            <li key={item.key} className="m-card">
              <p className="m-card-kicker">{item.type === "menu" ? "Menu" : "Website page"}</p>
              <p className="m-card-title">{item.title}</p>
              {d?.kind === "published" && <UndoBar message={<strong>On the website now. ✓</strong>} onUndo={d.undo} />}
              {d?.kind === "bulk" && <p className="m-notice m-notice--good">On the website now. ✓</p>}
              {d?.kind === "discarded" && <p className="m-notice">Change thrown away. The website stays as it was.</p>}
              {d?.kind === "removed" && <p className="m-notice">Removed. You can bring it back from Recently removed.</p>}
              {!d && (
                <>
                  {isNewMenuItem ? (
                    <p>
                      <strong>New item</strong> — not on the website yet.
                    </p>
                  ) : item.change.differences.length === 0 ? (
                    <p>Saved again, with nothing that shows on the website changed.</p>
                  ) : (
                    <dl className="m-diff">
                      {item.change.differences.map((x) => (
                        <div key={x.what}>
                          <dt>{x.what}</dt>
                          <dd>
                            <span className="m-diff-before">Now: {x.before}</span>
                            <span className="m-diff-after">New: {x.after}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {item.type === "menu" ? (
                    <details className="m-details">
                      <summary>See how it will look</summary>
                      <ItemPreview item={item.change.preview} />
                    </details>
                  ) : (
                    <a href={item.change.previewUrl} target="_blank" rel="noopener" className="m-btn m-btn--block" style={{ marginBottom: 10 }}>
                      👀 See how the page will look
                    </a>
                  )}
                  <div className="m-stack">
                    <button type="button" className="m-btn m-btn--primary m-btn--block" disabled={busy === item.key} onClick={() => publish(item)}>
                      {busy === item.key ? "One moment…" : "Put on website"}
                    </button>
                    <Link
                      href={item.type === "menu" ? `/manage/menu/${item.change.id}` : `/manage/website/${item.change.slug}`}
                      className="m-btn m-btn--block"
                    >
                      ✏️ Change it more first
                    </Link>
                    {isNewMenuItem ? (
                      <button
                        type="button"
                        className="m-btn m-btn--block"
                        disabled={busy === item.key}
                        onClick={() => item.type === "menu" && run(item, () => removeMenuItem(item.change.id), () => ({ kind: "removed" }))}
                      >
                        🗑 Don&apos;t add it after all
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="m-btn m-btn--block"
                        disabled={busy === item.key}
                        onClick={() =>
                          run(
                            item,
                            () => (item.type === "menu" ? discardMenuChanges(item.change.id) : discardPageChanges(item.change.slug)),
                            () => ({ kind: "discarded" }),
                          )
                        }
                      >
                        Throw away this change
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {waiting.length > 1 && (
        <div className="m-footer-actions">
          {confirmAll ? (
            <div className="m-notice m-notice--warn">
              <p style={{ marginTop: 0 }}>
                <strong>Put all {waiting.length} of these on the website?</strong>
              </p>
              <ul>
                {waiting.map((i) => (
                  <li key={i.key}>
                    {i.title} <span className="m-hint">({i.type === "menu" ? "menu" : "page"})</span>
                  </li>
                ))}
              </ul>
              <div className="m-stack">
                <button
                  type="button"
                  className="m-btn m-btn--primary m-btn--block"
                  disabled={busy === "all"}
                  onClick={async () => {
                    setBusy("all");
                    setError(null);
                    const menuIds = waiting.flatMap((i) => (i.type === "menu" ? [i.change.id] : []));
                    const slugs = waiting.flatMap((i) => (i.type === "page" ? [i.change.slug] : []));
                    const [m, p] = await Promise.all([
                      menuIds.length ? publishMenuItems(menuIds) : Promise.resolve({ ok: true as const, published: 0, failed: 0 }),
                      slugs.length ? publishPages(slugs) : Promise.resolve({ ok: true as const, published: 0, failed: 0 }),
                    ]);
                    setBusy(null);
                    setConfirmAll(false);
                    if (!m.ok || !p.ok) return setError(!m.ok ? m.message : !p.ok ? p.message : "");
                    if (m.failed + p.failed > 0) {
                      setError(`${m.failed + p.failed} of them didn't go up. They're still listed — please try those again.`);
                      setTimeout(() => window.location.reload(), 2500);
                    } else {
                      setDone((d) => ({ ...d, ...Object.fromEntries(waiting.map((i) => [i.key, { kind: "bulk" as const }])) }));
                    }
                  }}
                >
                  {busy === "all" ? "Putting them on…" : `Yes, put all ${waiting.length} on the website`}
                </button>
                <button type="button" className="m-btn m-btn--block" onClick={() => setConfirmAll(false)}>
                  No, go back
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="m-btn m-btn--block" onClick={() => setConfirmAll(true)}>
              Put all {waiting.length} on the website…
            </button>
          )}
        </div>
      )}

      {waiting.length === 0 && (
        <Link href="/manage" className="m-btn m-btn--block" style={{ marginTop: 24 }}>
          All done — back to home
        </Link>
      )}
    </>
  );
}

// A simple stand-in for how a menu item will look — this one item only, not
// the whole menu (so other waiting changes don't mix in).
function ItemPreview({ item }: { item: MenuItemView }) {
  return (
    <div className="m-preview-card" style={{ marginTop: 12 }}>
      {item.image?.url && <img src={item.image.url} alt="" />}
      <div style={{ padding: "12px 16px" }}>
        {item.tag && <p className="m-card-kicker">{item.tag}</p>}
        <p className="m-card-title">{item.title}</p>
        {item.description && <p style={{ margin: "4px 0 8px" }}>{item.description}</p>}
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {item.priceOptions.map((p, i) => (
            <li key={i}>
              {p.label} — <strong>{p.price}</strong>
              {p.note ? ` (${p.note})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
