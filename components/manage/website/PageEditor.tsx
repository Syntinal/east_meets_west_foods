"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PageView, PageUndo } from "@/lib/manage/websiteOps";
import type { FaqRow, FieldDef, FieldValue, GalleryRow, PageDef, Photo } from "@/lib/manage/websitePages";
import type { Paragraph } from "@/lib/manage/richParagraphs";
import { publishPage, savePageSection, undoPageChange } from "@/app/(manage)/manage/website/actions";
import { UndoBar } from "@/components/manage/UndoBar";
import { SectionFields } from "./SectionFields";

type After = { kind: "saved"; undo: PageUndo | null } | { kind: "published"; undo: PageUndo | null };

// One website page, shown section by section in roughly the order and look
// of the real page, each with a big "Change this" button. Changing a
// section opens just that section's fields (one task per screen). Saving
// never touches the website; "Put this page on the website" does.
export function PageEditor({ def, view }: { def: PageDef; view: PageView }) {
  const [sections, setSections] = useState(view.sections);
  const [waiting, setWaiting] = useState(view.waiting);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, FieldValue>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [after, setAfter] = useState<After | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Leaving with unsaved typing: ask first.
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

  const sectionDef = (key: string) => def.sections.find((s) => s.key === key)!;

  function open(key: string) {
    setDraftValues({ ...sections.find((s) => s.key === key)!.values });
    setEditing(key);
    setDirty(false);
    setError(null);
    setAfter(null);
    window.scrollTo({ top: 0 });
  }

  function close() {
    if (dirty && !confirm("You have changes that aren't saved yet. Go back without saving them?")) return;
    setEditing(null);
    setDirty(false);
    window.scrollTo({ top: 0 });
  }

  async function save() {
    if (!editing || busy || photoBusy) return;
    setBusy(true);
    setError(null);
    const r = await savePageSection({ slug: def.slug, sectionKey: editing, values: draftValues });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      window.scrollTo({ top: 0 });
      return;
    }
    setSections((list) => list.map((s) => (s.key === editing ? { ...s, values: draftValues } : s)));
    setWaiting(true);
    setDirty(false);
    setEditing(null);
    setAfter({ kind: "saved", undo: r.undo });
    window.scrollTo({ top: 0 });
  }

  async function publish() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await publishPage(def.slug);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setWaiting(false);
    setAfter({ kind: "published", undo: r.undo });
    window.scrollTo({ top: 0 });
  }

  const undoWith = (token: PageUndo | null) =>
    token
      ? async () => {
          const r = await undoPageChange(token);
          if (r.ok) setTimeout(() => window.location.reload(), 1200);
          return r;
        }
      : undefined;

  const previewLink = (
    <a href={view.previewUrl} target="_blank" rel="noopener" className="m-btn m-btn--block">
      👀 See how the page will look
    </a>
  );

  // ---------- One section's fields ----------
  if (editing) {
    const sec = sectionDef(editing);
    return (
      <>
        <p className="m-step-count">{def.label}</p>
        <h1>{sec.title}</h1>
        {error && (
          <div className="m-notice m-notice--error" role="alert">
            {error}
          </div>
        )}
        <SectionFields
          fields={sec.fields}
          values={draftValues}
          onChange={(path, value) => {
            setDraftValues((v) => ({ ...v, [path]: value }));
            setDirty(true);
          }}
          onPhotoBusy={setPhotoBusy}
        />
        <div className="m-save-area">
          <button
            type="button"
            className="m-btn m-btn--primary m-btn--block m-save"
            onClick={save}
            disabled={busy || photoBusy || !dirty}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <p className="m-hint" style={{ textAlign: "center", margin: "8px 0 4px" }}>
            Your changes will be saved as a draft. They won&apos;t appear on your website until you publish them.
          </p>
          <button type="button" className="m-textbtn m-textbtn--center" onClick={close} disabled={busy}>
            ← Back to the page without saving
          </button>
        </div>
      </>
    );
  }

  // ---------- The page, section by section ----------
  return (
    <>
      <h1>{def.label}</h1>

      {after?.kind === "saved" && (
        <UndoBar
          message={
            <>
              <strong>Saved.</strong> This change is <strong>not on the website yet</strong>.
            </>
          }
          onUndo={undoWith(after.undo)}
        >
          <div className="m-stack" style={{ marginTop: 12 }}>
            <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={publish} disabled={busy}>
              {busy ? "One moment…" : "Put this page on the website now"}
            </button>
            {previewLink}
            <p className="m-hint" style={{ margin: 0 }}>
              Or keep changing other parts first — they&apos;ll all go on together.
            </p>
          </div>
        </UndoBar>
      )}

      {after?.kind === "published" && (
        <UndoBar message={<strong>This page is on the website now. ✓</strong>} onUndo={undoWith(after.undo)}>
          <a
            href={def.sitePath}
            target="_blank"
            rel="noopener"
            className="m-btn m-btn--block"
            style={{ marginTop: 12 }}
          >
            See it on the website
          </a>
        </UndoBar>
      )}

      {waiting && !after && (
        <div className="m-notice m-notice--warn">
          <p style={{ marginTop: 0 }}>
            This page has saved changes that are <strong>not on the website yet</strong>. Below is the saved version.
          </p>
          <div className="m-stack">
            <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={publish} disabled={busy}>
              {busy ? "One moment…" : "Put this page on the website"}
            </button>
            {previewLink}
          </div>
        </div>
      )}

      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}

      <p className="m-intro">Tap “Change this” on the part you want to change.</p>

      <ol className="m-cards m-page-sections">
        {sections.map((s) => {
          const sec = sectionDef(s.key);
          return (
            <li key={s.key} className="m-card">
              <p className="m-card-kicker">{sec.title}</p>
              <div className="m-section-look">
                {sec.fields.map((f) => (
                  <FieldLook key={f.path} field={f} value={s.values[f.path]} />
                ))}
              </div>
              <button type="button" className="m-btn m-btn--block" onClick={() => open(s.key)}>
                ✏️ Change this
              </button>
            </li>
          );
        })}
      </ol>

      {def.elsewhere && (
        <p className="m-hint" style={{ marginTop: 24 }}>
          <strong>Not shown here:</strong> {def.elsewhere}. Those are changed in the regular editor — ask for help if you need
          them changed.
        </p>
      )}

      <Link href="/manage/website" className="m-btn m-btn--block" style={{ marginTop: 16 }}>
        Back to the list of pages
      </Link>
    </>
  );
}

// A section's content, shown roughly the way it looks on the website.
function FieldLook({ field, value }: { field: FieldDef; value: FieldValue }) {
  const empty = <p className="m-look-empty">({field.label}: empty)</p>;
  switch (field.kind) {
    case "photo": {
      const p = value as Photo | null;
      return p?.url ? <img src={p.url} alt="" className="m-look-photo" /> : empty;
    }
    case "text":
    case "textarea": {
      const text = value as string;
      if (!text) return empty;
      if (field.label === "Heading") return <p className="m-look-heading">{text}</p>;
      if (field.label.startsWith("Small label")) return <p className="m-look-eyebrow">{text}</p>;
      return <p className="m-look-text">{text}</p>;
    }
    case "paragraphs": {
      const paras = value as Paragraph[];
      return paras.length ? (
        <>
          {paras.map((p, i) => (
            <p key={i} className="m-look-text">
              {p.text}
            </p>
          ))}
        </>
      ) : (
        empty
      );
    }
    case "faq": {
      const rows = value as FaqRow[];
      return rows.length ? (
        <dl className="m-look-faq">
          {rows.map((r, i) => (
            <div key={r.id ?? i}>
              <dt>{r.question}</dt>
              <dd>{r.answer.map((p) => p.text).join(" ")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        empty
      );
    }
    case "gallery": {
      const rows = value as GalleryRow[];
      return rows.length ? (
        <div className="m-look-gallery">
          {rows.map((r, i) => (r.image?.url ? <img key={r.id ?? i} src={r.image.url} alt="" /> : null))}
        </div>
      ) : (
        <p className="m-look-empty">(No photos in the gallery yet)</p>
      );
    }
  }
}
