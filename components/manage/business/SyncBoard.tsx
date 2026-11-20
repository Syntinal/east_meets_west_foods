"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Board, BoardRow } from "@/lib/businessSync/board";
import { checkGoogleNow, markListingAction, sendAgain } from "@/app/(manage)/manage/business/actions";

// "Where your info is shown": one row per place, colored by whether it's
// up to date. Automatic places (website, Google, Facebook) first, then the
// places the owner updates by hand, each with a link and an
// "I've updated it" button. While Google is still reviewing a change, the
// page re-checks by itself every minute.

const MARK: Record<BoardRow["tone"], string> = { good: "✓", warn: "…", bad: "!", neutral: "–" };
const DEST_CLASS: Record<BoardRow["tone"], string> = { good: "m-dest--good", warn: "m-dest--warn", bad: "m-dest--bad", neutral: "" };

export function SyncBoard({ board, copyText }: { board: Board; copyText: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!board.waitingOnGoogle) return;
    const t = setInterval(async () => {
      await checkGoogleNow();
      router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [board.waitingOnGoogle, router]);

  async function run(id: string, fn: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(id);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.message ?? "Something went wrong. Please try again.");
    router.refresh();
    setBusy(null);
  }

  const total = board.automatic.length + board.byHand.length;
  const upToDate = [...board.automatic, ...board.byHand].filter((r) => r.tone === "good").length;
  const needYou = board.byHand.filter((r) => r.tone !== "good").length;

  function renderRow(row: BoardRow) {
    return (
      <li key={row.key} className={`m-dest ${DEST_CLASS[row.tone]}`}>
        <span className="m-dest-mark" aria-hidden="true">
          {MARK[row.tone]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{row.name}</strong>
          {row.test && <span className="m-badge m-badge--warn" style={{ marginLeft: 8 }}>Test mode</span>}
          <div>{row.headline}</div>
          {row.detail && <div className="m-hint">{row.detail}</div>}
          {row.how && row.tone !== "good" && row.tone !== "neutral" && <div className="m-hint">{row.how}</div>}
          {(row.link || row.actions.length > 0) && (
            <div className="m-sync-actions">
              {row.link && row.tone !== "neutral" && (
                <a className="m-btn m-btn--small" href={row.link.href} target="_blank" rel="noopener noreferrer">
                  {row.link.label} ↗
                </a>
              )}
              {row.actions.includes("done") && (
                <button
                  type="button"
                  className="m-btn m-btn--small m-btn--primary"
                  disabled={busy !== null}
                  onClick={() => run(`${row.key}-done`, () => markListingAction(row.key, "done"))}
                >
                  {busy === `${row.key}-done` ? "Saving…" : "✓ I've updated it"}
                </button>
              )}
              {row.actions.includes("resend") && row.platform && (
                <button
                  type="button"
                  className="m-btn m-btn--small m-btn--primary"
                  disabled={busy !== null}
                  onClick={() => run(`${row.key}-resend`, () => sendAgain(row.platform!))}
                >
                  {busy === `${row.key}-resend` ? "Sending…" : row.headline === "Not sent yet" ? "Send now" : "Send again"}
                </button>
              )}
              {row.actions.includes("check") && (
                <button type="button" className="m-btn m-btn--small" disabled={busy !== null} onClick={() => run(`${row.key}-check`, checkGoogleNow)}>
                  {busy === `${row.key}-check` ? "Checking…" : "Check now"}
                </button>
              )}
              {row.actions.includes("skip") && (
                <button
                  type="button"
                  className="m-textbtn"
                  disabled={busy !== null}
                  onClick={() => run(`${row.key}-skip`, () => markListingAction(row.key, "skip"))}
                >
                  We&apos;re not on {row.name}
                </button>
              )}
              {row.actions.includes("unskip") && (
                <button
                  type="button"
                  className="m-textbtn"
                  disabled={busy !== null}
                  onClick={() => run(`${row.key}-unskip`, () => markListingAction(row.key, "unskip"))}
                >
                  Put {row.name} back on the list
                </button>
              )}
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <>
      <p className={`m-notice ${upToDate === total ? "m-notice--good" : "m-notice--warn"}`}>
        <strong>
          {upToDate} of {total} places are up to date.
        </strong>
        {needYou > 0 && (
          <>
            {" "}
            {needYou === 1 ? "1 place needs" : `${needYou} places need`} you to update it yourself (below).
          </>
        )}
      </p>

      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}

      <h2 className="m-subhead">Updated for you</h2>
      <ul className="m-dests">
        {board.automatic.map(renderRow)}
      </ul>

      <h2 className="m-subhead">Update these yourself</h2>
      <p className="m-hint" style={{ marginTop: 0 }}>
        These places don&apos;t let the website change them for free. Open each one, make it match, then press
        &ldquo;I&apos;ve updated it&rdquo;.
      </p>
      <CopyInfo text={copyText} />
      <ul className="m-dests">
        {board.byHand.map(renderRow)}
      </ul>

      {board.notListed.length > 0 && (
        <details className="m-details">
          <summary>Places you said the restaurant isn&apos;t on ({board.notListed.length})</summary>
          <ul className="m-dests">
            {board.notListed.map(renderRow)}
          </ul>
        </details>
      )}
    </>
  );
}

function CopyInfo({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <details className="m-details">
      <summary>Show what to enter</summary>
      <pre className="m-copy-box">{text}</pre>
      <button
        type="button"
        className="m-btn m-btn--small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "✓ Copied" : "Copy it all"}
      </button>
    </details>
  );
}
