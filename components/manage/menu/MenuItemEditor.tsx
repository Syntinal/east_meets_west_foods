"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MenuItemView, PriceRow } from "@/lib/manage/menu";
import type { UndoToken } from "@/lib/manage/menuOps";
import {
  publishMenuItem,
  removeMenuItem,
  restoreMenuItem,
  saveMenuItem,
  undoMenuChange,
} from "@/app/(manage)/manage/menu/actions";
import { PhotoPicker, type PickedPhoto } from "@/components/manage/PhotoPicker";
import { UndoBar } from "@/components/manage/UndoBar";

type Row = PriceRow & { key: number };
let rowKey = 0;
const toRows = (rows: PriceRow[]): Row[] => (rows.length ? rows : [{ label: "", price: "" }]).map((r) => ({ ...r, key: ++rowKey }));

type After =
  | { kind: "saved"; undo: UndoToken | null; isNew: boolean }
  | { kind: "published"; undo: UndoToken | null }
  | { kind: "removed" };

export function MenuItemEditor({ item }: { item: MenuItemView | null }) {
  const [id, setId] = useState(item?.id ?? null);
  const [group, setGroup] = useState<MenuItemView["group"] | null>(item?.group ?? null);
  const [title, setTitle] = useState(item?.title ?? "");
  const [tag, setTag] = useState(item?.tag ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [photo, setPhoto] = useState<PickedPhoto | null>(item?.image ?? null);
  const [rows, setRows] = useState<Row[]>(() => toRows(item?.priceOptions ?? []));
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [after, setAfter] = useState<After | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const touch = () => (setDirty(true), setAfter(null));

  // Leaving with unsaved typing: ask first (browser close/reload, and the
  // Back / Home links at the top of the screen).
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (a && !confirm("You have changes that aren't saved yet. Leave without saving them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function save() {
    if (busy || photoBusy) return;
    setBusy(true);
    setError(null);
    const r = await saveMenuItem({
      id: id ?? undefined,
      group: group ?? "main",
      title,
      tag,
      description,
      imageId: photo?.id ?? null,
      priceOptions: rows.map(({ label, price, note }) => ({ label, price, note })),
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      scrollTop();
      return;
    }
    const isNew = !id;
    setId(r.id);
    setDirty(false);
    setAfter({ kind: "saved", undo: r.undo, isNew });
    scrollTop();
  }

  async function publish() {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    const r = await publishMenuItem(id);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setAfter({ kind: "published", undo: r.undo });
    scrollTop();
  }

  async function remove() {
    if (!id || busy) return;
    setBusy(true);
    const r = await removeMenuItem(id);
    setBusy(false);
    setConfirmRemove(false);
    if (!r.ok) return setError(r.message);
    setDirty(false);
    setAfter({ kind: "removed" });
    scrollTop();
  }

  const undoWith = (token: UndoToken | null) =>
    token
      ? async () => {
          const r = await undoMenuChange(token);
          // Reload so the form shows what's saved now.
          if (r.ok) setTimeout(() => window.location.reload(), 1200);
          return r;
        }
      : undefined;

  // ----- New item: first, which part of the menu? -----
  if (!group) {
    return (
      <>
        <h1>Add a new item</h1>
        <p className="m-intro">Where does it go on the menu?</p>
        <div className="m-stack">
          <button type="button" className="m-btn m-btn--block m-btn--tall" onClick={() => setGroup("main")}>
            🥟 Main dishes
            <span className="m-btn-sub">With a photo and description</span>
          </button>
          <button type="button" className="m-btn m-btn--block m-btn--tall" onClick={() => setGroup("extras")}>
            🥤 Extras &amp; drinks
            <span className="m-btn-sub">Just a name and price</span>
          </button>
        </div>
      </>
    );
  }

  if (after?.kind === "removed") {
    return (
      <>
        <UndoBar
          message={`“${title}” was removed from the menu and the website.`}
          onUndo={async () => {
            const r = await restoreMenuItem(id!);
            if (r.ok) setTimeout(() => window.location.reload(), 1200);
            return r;
          }}
        >
          <p style={{ margin: "8px 0 0" }}>You can also bring it back later from Recently removed.</p>
        </UndoBar>
        <Link href="/manage/menu" className="m-btn m-btn--primary m-btn--block">
          Back to the menu
        </Link>
      </>
    );
  }

  return (
    <div ref={top}>
      <h1>{id ? title || "Menu item" : "Add a new item"}</h1>

      {after?.kind === "saved" && (
        <UndoBar
          message={
            <>
              <strong>Saved.</strong> {after.isNew ? "This new item is" : "This change is"} <strong>not on the website yet</strong>.
            </>
          }
          onUndo={undoWith(after.undo)}
        >
          <div className="m-stack" style={{ marginTop: 12 }}>
            <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={publish} disabled={busy}>
              {busy ? "One moment…" : "Put it on the website now"}
            </button>
            <Link href="/manage/menu" className="m-btn m-btn--block">
              Not yet — back to the menu
            </Link>
          </div>
        </UndoBar>
      )}

      {after?.kind === "published" && (
        <UndoBar message={<strong>It&apos;s on the website now. ✓</strong>} onUndo={undoWith(after.undo)}>
          <Link href="/manage/menu" className="m-btn m-btn--block" style={{ marginTop: 12 }}>
            Back to the menu
          </Link>
        </UndoBar>
      )}

      {item?.status === "changes" && !after && (
        <div className="m-notice m-notice--warn">
          This item has saved changes that are <strong>not on the website yet</strong>. You&apos;re seeing the saved version.
          <button type="button" className="m-btn m-btn--block" style={{ marginTop: 12 }} onClick={publish} disabled={busy || dirty}>
            Put the saved changes on the website
          </button>
        </div>
      )}

      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}

      <label className="m-field">
        <span className="m-label">Name</span>
        <input className="m-input" value={title} onChange={(e) => (setTitle(e.target.value), touch())} />
      </label>

      <fieldset className="m-fieldset">
        <legend className="m-label">Prices</legend>
        {rows.map((row, i) => (
          <div key={row.key} className="m-price-row">
            <label>
              <span className="m-sublabel">Size or amount</span>
              <input
                className="m-input"
                value={row.label}
                placeholder="Small"
                onChange={(e) => (setRows(rows.map((r) => (r.key === row.key ? { ...r, label: e.target.value } : r))), touch())}
              />
            </label>
            <label>
              <span className="m-sublabel">Price</span>
              <input
                className="m-input"
                value={row.price}
                placeholder="$8.99"
                inputMode="decimal"
                onChange={(e) => (setRows(rows.map((r) => (r.key === row.key ? { ...r, price: e.target.value } : r))), touch())}
              />
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                className="m-btn m-btn--small"
                aria-label={`Remove price ${i + 1}`}
                onClick={() => (setRows(rows.filter((r) => r.key !== row.key)), touch())}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="m-btn m-btn--block"
          onClick={() => (setRows([...rows, { label: "", price: "", key: ++rowKey }]), touch())}
        >
          + Add another price
        </button>
      </fieldset>

      {group === "main" && (
        <>
          <label className="m-field">
            <span className="m-label">Description</span>
            <textarea
              className="m-input m-textarea"
              style={{ minHeight: 140 }}
              value={description}
              onChange={(e) => (setDescription(e.target.value), touch())}
            />
          </label>

          <label className="m-field">
            <span className="m-label">Small label above the name (optional)</span>
            <input
              className="m-input"
              value={tag}
              placeholder="Northern Chinese"
              onChange={(e) => (setTag(e.target.value), touch())}
            />
          </label>

          <div className="m-field">
            <span className="m-label">Photo</span>
            <PhotoPicker value={photo} onChange={(p) => (setPhoto(p), touch())} onBusyChange={setPhotoBusy} />
          </div>
        </>
      )}

      <button
        type="button"
        className="m-btn m-btn--primary m-btn--block m-btn--tall m-save"
        onClick={save}
        disabled={busy || photoBusy || (!dirty && Boolean(id))}
      >
        {busy ? "Saving…" : dirty || !id ? "Save" : "Saved ✓"}
      </button>
      <p className="m-hint" style={{ textAlign: "center" }}>
        Saving doesn&apos;t change the website yet — you&apos;ll get a button to do that next.
      </p>

      {id && (
        <div className="m-footer-actions">
          {confirmRemove ? (
            <div className="m-notice m-notice--error" style={{ color: "inherit", fontWeight: 400 }}>
              <p style={{ marginTop: 0 }}>
                <strong>Remove “{title}” from the menu?</strong> It will disappear from the website. You can bring it back from
                Recently removed.
              </p>
              <div className="m-stack">
                <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={remove} disabled={busy}>
                  Yes, remove it
                </button>
                <button type="button" className="m-btn m-btn--block" onClick={() => setConfirmRemove(false)}>
                  No, keep it
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="m-btn m-btn--block" onClick={() => setConfirmRemove(true)}>
              🗑 Remove from menu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
