"use client";

import { useState } from "react";

// Uses Payload's own logout endpoint (same cookie /admin uses), then goes
// to the /manage login screen.
export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="m-btn m-btn--block"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/users/logout", { method: "POST", credentials: "include" });
        } finally {
          window.location.href = "/manage/login";
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
