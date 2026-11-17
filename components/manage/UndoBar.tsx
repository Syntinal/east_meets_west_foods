"use client";

import { useEffect, useState } from "react";

const UNDO_WINDOW_MS = 30_000;

// A plain-words confirmation ("Saved.") with an Undo button that stays for
// 30 seconds. After that, older changes can still be put back from /admin's
// version history — this is just the quick "oops" button.
export function UndoBar({
  message,
  onUndo,
  children,
}: {
  message: React.ReactNode;
  onUndo?: () => Promise<{ ok: boolean; message?: string }>;
  children?: React.ReactNode;
}) {
  const [showUndo, setShowUndo] = useState(Boolean(onUndo));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!onUndo) return;
    setShowUndo(true);
    setResult(null);
    const t = setTimeout(() => setShowUndo(false), UNDO_WINDOW_MS);
    return () => clearTimeout(t);
  }, [onUndo]);

  return (
    <div className="m-notice m-notice--good" role="status">
      <p style={{ margin: 0 }}>{result ?? message}</p>
      {children}
      {showUndo && onUndo && !result && (
        <button
          type="button"
          className="m-btn m-btn--small"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await onUndo();
            setBusy(false);
            setShowUndo(false);
            setResult(r.ok ? "Undone — it's back the way it was." : (r.message ?? "That couldn't be undone."));
          }}
        >
          {busy ? "Undoing…" : "↶ Undo"}
        </button>
      )}
    </div>
  );
}
