"use client";

import { useState } from "react";

// Posts to Payload's own login endpoint, which sets the same cookie /admin
// uses — no separate login system. Errors are translated into plain words.
export function LoginForm({ helpName }: { helpName: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") ?? "").trim(), password: form.get("password") }),
      });
      if (res.ok) {
        window.location.href = "/manage";
        return;
      }
      const body = await res.json().catch(() => null);
      const detail = JSON.stringify(body ?? "").toLowerCase();
      setError(
        detail.includes("locked")
          ? `Too many tries in a row. Please wait 10 minutes, or call ${helpName}.`
          : "That email or password didn't match. Please try again.",
      );
    } catch {
      setError("We couldn't reach the website. Check that you're connected to the internet, then try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}
      <label className="m-field">
        <span className="m-label">Email</span>
        <input className="m-input" name="email" type="email" autoComplete="username" inputMode="email" required />
      </label>
      <div className="m-field">
        <label className="m-label" htmlFor="m-password">
          Password
        </label>
        <div className="m-password-row">
          <input
            id="m-password"
            className="m-input"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button type="button" className="m-btn" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button type="submit" className="m-btn m-btn--primary m-btn--block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p style={{ marginTop: 24 }}>
        <strong>Forgot your password?</strong> Call or text {helpName} to get a new one set up.
      </p>
    </form>
  );
}
