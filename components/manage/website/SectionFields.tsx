"use client";

import { useEffect, useRef, useState } from "react";
import type { CardRow, FaqRow, FieldDef, FieldValue, GalleryRow, Photo } from "@/lib/manage/websitePages";
import { adjustSpans, type Paragraph } from "@/lib/manage/richParagraphs";
import { PhotoPicker } from "@/components/manage/PhotoPicker";
import { DestinationPicker, ParagraphLinks } from "./LinkEditing";

type Props = {
  fields: FieldDef[];
  values: Record<string, FieldValue>;
  onChange: (path: string, value: FieldValue) => void;
  onPhotoBusy: (busy: boolean) => void;
};

export function SectionFields({ fields, values, onChange, onPhotoBusy }: Props) {
  return (
    <>
      {fields.map((f) => {
        const v = values[f.path];
        const set = (next: FieldValue) => onChange(f.path, next);
        switch (f.kind) {
          case "text":
            return (
              <label key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                {f.hint && <span className="m-sublabel">{f.hint}</span>}
                <input className="m-input" value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} />
              </label>
            );
          case "textarea":
            return (
              <label key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                <textarea
                  className="m-input m-textarea"
                  style={{ minHeight: 140 }}
                  value={(v as string) ?? ""}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            );
          case "photo":
            return (
              <div key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                <PhotoPicker value={v as Photo | null} onChange={set} onBusyChange={onPhotoBusy} />
              </div>
            );
          case "paragraphs":
            return (
              <div key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                <ParagraphsEditor value={(v as Paragraph[]) ?? []} onChange={set} />
              </div>
            );
          case "faq":
            return <FaqEditor key={f.path} value={(v as FaqRow[]) ?? []} onChange={set} />;
          case "gallery":
            return (
              <div key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                <GalleryEditor value={(v as GalleryRow[]) ?? []} onChange={set} onPhotoBusy={onPhotoBusy} />
              </div>
            );
          case "link":
            return (
              <div key={f.path} className="m-field">
                <span className="m-label">{f.label}</span>
                <DestinationPicker value={(v as string) || null} onChange={set} />
              </div>
            );
          case "cards":
            return <CardsEditor key={f.path} value={(v as CardRow[]) ?? []} onChange={set} onPhotoBusy={onPhotoBusy} />;
        }
      })}
    </>
  );
}

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

// The answer/text as ONE continuous editing box: paragraphs are separated by
// thin dividers, not separate cards. Links and bold words are kept as the
// owner types (lib/manage/richParagraphs.ts) and links are listed under
// their paragraph in plain words, with Change / Remove. Only unusual
// paragraphs (lists, links to a specific document) are locked.
function ParagraphsEditor({ value, onChange }: { value: Paragraph[]; onChange: (v: Paragraph[]) => void }) {
  const showLabels = value.length > 1;
  return (
    <>
      <div className="m-answer">
        {value.map((p, i) => (
          <div key={i} className="m-answer-para">
            {(showLabels || p.kind === "locked") && (
              <div className="m-answer-para-head">
                <span className="m-answer-label">Paragraph {i + 1}</span>
                <button
                  type="button"
                  className="m-quietbtn"
                  aria-label={`Remove paragraph ${i + 1}`}
                  onClick={() => {
                    if (confirm("Remove this paragraph?")) onChange(value.filter((_, j) => j !== i));
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            {p.kind === "locked" ? (
              <>
                <p className="m-answer-locked">{p.text}</p>
                <p className="m-answer-note">🔒 This part is a list or has a special kind of link, so it&apos;s changed in the regular editor. Reach out if it needs changing.</p>
              </>
            ) : (
              <>
                <textarea
                  className="m-answer-input"
                  rows={4}
                  value={p.text}
                  aria-label={`Paragraph ${i + 1}`}
                  onChange={(e) => {
                    const text = e.target.value;
                    // Links and bold words move along with the typing.
                    onChange(value.map((x, j) => (j === i && x.kind === "plain" ? { ...x, text, spans: adjustSpans(x.spans, x.text, text) } : x)));
                  }}
                />
                <ParagraphLinks p={p} onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))} />
              </>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="m-quietbtn m-quietbtn--add" onClick={() => onChange([...value, { kind: "plain", text: "" }])}>
        + Add a paragraph
      </button>
    </>
  );
}

// "More" menu for one question: Move up / Move down / Remove question, so
// those don't sit as a row of buttons under every question.
function QuestionMenu({
  n,
  canUp,
  canDown,
  onUp,
  onDown,
  onRemove,
  removeLabel = "Remove question",
}: {
  n: number;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  removeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div className="m-more" ref={ref}>
      <button
        type="button"
        className="m-more-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${removeLabel.replace("Remove ", "")} ${n}`}
        onClick={() => setOpen((o) => !o)}
      >
        More <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="m-more-menu" role="menu">
          <button type="button" role="menuitem" disabled={!canUp} onClick={act(onUp)}>
            ↑ Move up
          </button>
          <button type="button" role="menuitem" disabled={!canDown} onClick={act(onDown)}>
            ↓ Move down
          </button>
          <button type="button" role="menuitem" className="m-more-danger" onClick={act(onRemove)}>
            {removeLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function FaqEditor({ value, onChange }: { value: FaqRow[]; onChange: (v: FaqRow[]) => void }) {
  return (
    <div className="m-q-list">
      {value.map((row, i) => {
        const n = i + 1;
        return (
          <section key={row.id ?? `new-${i}`} className="m-q-card" aria-label={`Question ${n}`}>
            <div className="m-q-head">
              <label className="m-q-title" htmlFor={`faq-q-${i}`}>
                Question {n}
              </label>
              <QuestionMenu
                n={n}
                canUp={i > 0}
                canDown={i < value.length - 1}
                onUp={() => onChange(move(value, i, -1))}
                onDown={() => onChange(move(value, i, 1))}
                onRemove={() => {
                  if (confirm(`Remove the question “${row.question || "(blank)"}”?`)) onChange(value.filter((_, j) => j !== i));
                }}
              />
            </div>
            <input
              id={`faq-q-${i}`}
              className="m-input"
              value={row.question}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
            />
            <span className="m-q-answer-title">Answer</span>
            <ParagraphsEditor
              value={row.answer}
              onChange={(answer) => onChange(value.map((x, j) => (j === i ? { ...x, answer } : x)))}
            />
          </section>
        );
      })}
      <button
        type="button"
        className="m-btn m-btn--secondary m-q-add"
        onClick={() => onChange([...value, { question: "", answer: [{ kind: "plain", text: "" }] }])}
      >
        + Add another question
      </button>
    </div>
  );
}

function GalleryEditor({
  value,
  onChange,
  onPhotoBusy,
}: {
  value: GalleryRow[];
  onChange: (v: GalleryRow[]) => void;
  onPhotoBusy: (b: boolean) => void;
}) {
  // A fresh, empty picker after each added photo.
  const [pickerKey, setPickerKey] = useState(0);
  return (
    <div className="m-stack">
      {value.length === 0 && <p className="m-hint">No photos yet.</p>}
      {value.map((row, i) => (
        <div key={row.id ?? `new-${i}`} className="m-card m-gallery-row">
          {row.image?.url && <img src={row.image.url} alt="" className="m-card-thumb" />}
          <div className="m-order-buttons" style={{ flexWrap: "wrap" }}>
            <button type="button" className="m-btn m-btn--small" disabled={i === 0} onClick={() => onChange(move(value, i, -1))}>
              ▲ Up
            </button>
            <button
              type="button"
              className="m-btn m-btn--small"
              disabled={i === value.length - 1}
              onClick={() => onChange(move(value, i, 1))}
            >
              ▼ Down
            </button>
            <button
              type="button"
              className="m-btn m-btn--small"
              onClick={() => {
                if (confirm("Remove this photo from the gallery?")) onChange(value.filter((_, j) => j !== i));
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="m-card">
        <span className="m-label">Add a photo</span>
        <PhotoPicker
          key={pickerKey}
          value={null}
          onBusyChange={onPhotoBusy}
          onChange={(p) => {
            if (!p) return;
            onChange([...value, { image: p, caption: "" }]);
            setPickerKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
}

// Cards (a page's "Card Grid"): one box per card, laid out like the FAQ editor.
function CardsEditor({
  value,
  onChange,
  onPhotoBusy,
}: {
  value: CardRow[];
  onChange: (v: CardRow[]) => void;
  onPhotoBusy: (b: boolean) => void;
}) {
  const edit = (i: number, patch: Partial<CardRow>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="m-q-list">
      {value.map((row, i) => {
        const n = i + 1;
        return (
          <section key={row.id ?? `new-${i}`} className="m-q-card" aria-label={`Card ${n}`}>
            <div className="m-q-head">
              <label className="m-q-title" htmlFor={`card-t-${i}`}>
                Card {n}
              </label>
              <QuestionMenu
                n={n}
                canUp={i > 0}
                canDown={i < value.length - 1}
                onUp={() => onChange(move(value, i, -1))}
                onDown={() => onChange(move(value, i, 1))}
                onRemove={() => {
                  if (confirm(`Remove the card “${row.title || "(blank)"}”?`)) onChange(value.filter((_, j) => j !== i));
                }}
                removeLabel="Remove card"
              />
            </div>
            <span className="m-q-answer-title">Name</span>
            <input id={`card-t-${i}`} className="m-input" value={row.title} onChange={(e) => edit(i, { title: e.target.value })} />
            <span className="m-q-answer-title">Photo (optional)</span>
            <PhotoPicker value={row.image} onChange={(image) => edit(i, { image })} onBusyChange={onPhotoBusy} />
            <span className="m-q-answer-title">Text (optional)</span>
            <ParagraphsEditor value={row.body} onChange={(body) => edit(i, { body })} />
            <label className="m-field" style={{ marginTop: 12 }}>
              <span className="m-q-answer-title">Price or short line at the bottom (optional)</span>
              <input className="m-input" value={row.priceLine} onChange={(e) => edit(i, { priceLine: e.target.value })} />
            </label>
          </section>
        );
      })}
      <button
        type="button"
        className="m-btn m-btn--secondary m-q-add"
        onClick={() => onChange([...value, { title: "", image: null, body: [{ kind: "plain", text: "" }], priceLine: "" }])}
      >
        + Add another card
      </button>
    </div>
  );
}
