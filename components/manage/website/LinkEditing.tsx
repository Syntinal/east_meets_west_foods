"use client";

import { createContext, useContext, useState } from "react";
import { describeLink, type LinkTarget } from "@/lib/manage/linkTargets";
import { findWords, isSafeHref, linksIn, type Paragraph } from "@/lib/manage/richParagraphs";

// Link editing for /manage, kept as simple as possible: links are shown in
// plain words under the paragraph ("“full menu” goes to the Menu page"),
// with Change / Remove buttons, and "Make some words a link" asks two
// questions — which words, and where to. No selecting text on a phone.

export const LinkTargetsContext = createContext<LinkTarget[]>([]);
export const useLinkTargets = () => useContext(LinkTargetsContext);

/** Normalizes what the owner typed for "another website". */
function websiteHref(typed: string): string | null {
  const t = typed.trim();
  if (!t || /\s/.test(t)) return null;
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return /^https?:\/\/[^/.]+\.[^/]+/i.test(url) && isSafeHref(url) ? url : null;
}

/** "Where should it go?" — the site's pages, calling the restaurant, or another website. */
export function DestinationPicker({ value, onChange }: { value: string | null; onChange: (url: string) => void }) {
  const targets = useLinkTargets();
  const isOther = value !== null && !targets.some((t) => t.url === value);
  const [other, setOther] = useState(isOther ? (value ?? "") : "");
  const [otherOpen, setOtherOpen] = useState(isOther);
  const [otherError, setOtherError] = useState<string | null>(null);
  return (
    <div className="m-dest-pick">
      <ul className="m-choices m-choices--compact">
        {targets.map((t) => {
          const on = value === t.url && !otherOpen;
          return (
            <li key={t.url}>
              <button
                type="button"
                className={`m-choice ${on ? "m-choice--on" : ""}`}
                aria-pressed={on}
                onClick={() => {
                  setOtherOpen(false);
                  onChange(t.url);
                }}
              >
                <span className="m-choice-mark" aria-hidden="true">
                  {on ? "✓" : ""}
                </span>
                <span className="m-choice-label">{t.label}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className={`m-choice ${otherOpen ? "m-choice--on" : ""}`}
            aria-pressed={otherOpen}
            onClick={() => setOtherOpen(true)}
          >
            <span className="m-choice-mark" aria-hidden="true">
              {otherOpen ? "✓" : ""}
            </span>
            <span className="m-choice-label">Another website</span>
          </button>
        </li>
      </ul>
      {otherOpen && (
        <label className="m-field">
          <span className="m-label">Website address</span>
          <span className="m-sublabel">Example: www.facebook.com/eastmeetswest</span>
          <input
            className="m-input"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={other}
            onChange={(e) => {
              setOther(e.target.value);
              const url = websiteHref(e.target.value);
              setOtherError(e.target.value.trim() && !url ? "That doesn't look like a website address yet." : null);
              if (url) onChange(url);
            }}
          />
          {otherError && <span className="m-hint m-hint--error">{otherError}</span>}
        </label>
      )}
    </div>
  );
}

/** The links in one paragraph, with Change / Remove, plus "Make some words a link". */
export function ParagraphLinks({ p, onChange }: { p: Extract<Paragraph, { kind: "plain" }>; onChange: (p: Paragraph) => void }) {
  const targets = useLinkTargets();
  const links = linksIn(p);
  // Which link is being changed (its span index), or "new".
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [words, setWords] = useState("");
  const [dest, setDest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function start(which: number | "new") {
    setOpen(which);
    setError(null);
    setWords("");
    setDest(which === "new" ? null : (p.spans?.[which]?.link?.url ?? null));
  }

  function removeLink(index: number) {
    const sp = p.spans?.[index];
    if (!sp) return;
    // Keep any bold/italic the words had; only the link goes.
    const spans = (p.spans ?? []).flatMap((x, i) => (i !== index ? [x] : x.look ? [{ start: x.start, end: x.end, look: x.look }] : []));
    onChange({ ...p, spans });
  }

  function confirm() {
    if (!dest) return setError("Choose where the link should go.");
    if (open === "new") {
      const range = findWords(p.text, p.spans, words);
      if (!range) {
        return setError(
          words.trim()
            ? "Those words aren't in this paragraph (or are already a link). Type them exactly as they appear above."
            : "Type the words that should be the link.",
        );
      }
      // If those words were already bold etc., the link takes their place and keeps the look.
      const covered = (p.spans ?? []).filter((x) => x.start < range.end && x.end > range.start);
      const look = covered.length === 1 && covered[0].start === range.start && covered[0].end === range.end ? covered[0].look : undefined;
      const rest = (p.spans ?? []).filter((x) => !(x.start < range.end && x.end > range.start));
      onChange({ ...p, spans: [...rest, { ...range, link: { url: dest }, ...(look ? { look } : {}) }].sort((a, b) => a.start - b.start) });
    } else if (typeof open === "number") {
      onChange({ ...p, spans: (p.spans ?? []).map((x, i) => (i === open ? { ...x, link: { url: dest, newTab: x.link?.newTab } } : x)) });
    }
    setOpen(null);
  }

  return (
    <div className="m-links">
      {links.length > 0 && (
        <ul className="m-link-list">
          {links.map((l) => (
            <li key={l.index} className="m-link-row">
              <span className="m-link-what">
                🔗 <strong>“{l.words}”</strong> goes to {describeLink(l.url, targets)}
              </span>
              <span className="m-link-actions">
                <button type="button" className="m-quietbtn" onClick={() => start(l.index)}>
                  Change
                </button>
                <button type="button" className="m-quietbtn" onClick={() => removeLink(l.index)}>
                  Remove link
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open === null ? (
        p.text.trim() && (
          <button type="button" className="m-quietbtn m-quietbtn--add" onClick={() => start("new")}>
            🔗 Make some words a link
          </button>
        )
      ) : (
        <div className="m-link-panel">
          {open === "new" ? (
            <label className="m-field">
              <span className="m-label">Which words should be the link?</span>
              <span className="m-sublabel">Type them exactly as they are in the paragraph.</span>
              <input className="m-input" value={words} onChange={(e) => setWords(e.target.value)} />
            </label>
          ) : (
            <p className="m-label" style={{ marginTop: 0 }}>
              Where should “{p.text.slice(p.spans![open].start, p.spans![open].end)}” go?
            </p>
          )}
          {open === "new" && <span className="m-label">Where should it go?</span>}
          <DestinationPicker value={dest} onChange={setDest} />
          {error && (
            <p className="m-notice m-notice--error" role="alert">
              {error}
            </p>
          )}
          <div className="m-nav-row">
            <button type="button" className="m-btn" onClick={() => setOpen(null)}>
              Cancel
            </button>
            <button type="button" className="m-btn m-btn--primary" onClick={confirm}>
              {open === "new" ? "Add the link" : "Done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
