"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@payloadcms/ui";
import { describeDevice, urlBase64ToUint8Array } from "@/lib/webPushClient";

// Lets whoever's logged into /admin opt their own device in to the
// "haven't posted in a while" push reminder (globals/ReminderSettings.ts
// controls when it actually fires; app/(frontend)/next/cron/remind-post
// sends it). Embedded in QuickActions.tsx, which stays a server component
// — this is the one client-side piece of that dashboard section, since
// notification/service-worker APIs only exist in the browser.
//
// The whole how-to (Add to Home Screen, open from there, Enable) lives
// right here on the dashboard rather than behind a link to an external
// doc — a non-technical owner isn't going to go click away to a separate
// page to figure out iOS's Home Screen requirement. (A one-off setup
// handoff doc still exists for whoever configures Vercel's env vars,
// which genuinely can't happen from this page — see CLAUDE.md.)
//
// iOS Safari's Push API is only available to a Home Screen-installed app
// (see CLAUDE.md's Web Push research) — a plain Safari tab has no
// `PushManager` at all. Android Chrome and desktop browsers have no such
// requirement; Push works directly in a normal tab there. So the 3-step
// walkthrough below is gated on actually being iOS *and* not already
// running as the installed Home Screen app (`needsHomeScreenSteps`) — an
// Android/desktop visitor just sees the Enable button, no iPhone-specific
// preamble that wouldn't apply to them.
type Status = "checking" | "unsupported" | "denied" | "subscribed" | "not-subscribed";

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // sends the Payload admin session cookie, same as any other same-origin admin fetch
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request to ${url} failed (${res.status})`);
  return res.json();
}

const stepListStyle = { margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 6 };
const stepTextStyle = { fontSize: 13.5, opacity: 0.85 };

// Real iPhone/iPad UA (not just "any touch device") — iPadOS 13+ reports
// as "Macintosh" in the UA string, which this deliberately doesn't try to
// catch via maxTouchPoints tricks: an iPad hitting the plain desktop-Mac
// branch below just sees the Enable button with no walkthrough, which is
// only wrong if that Enable click then fails — an acceptable, narrow gap
// for a feature built around the owner's phone, not chased further here.
function isIOSDevice() {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own pre-manifest-standard flag — still the only signal
    // on older iOS versions, so kept alongside the modern media query
    // rather than instead of it.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PushReminderButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  // Computed once per mount, not per render — neither the UA nor the
  // display mode changes while this component is alive.
  const [needsHomeScreenSteps] = useState(() => isIOSDevice() && !isStandaloneDisplay());

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "subscribed" : "not-subscribed");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast needed purely for TS's benefit — lib.dom's `BufferSource`
        // wants a Uint8Array<ArrayBuffer> specifically, while a plain
        // `new Uint8Array(...)` types as the more general
        // Uint8Array<ArrayBufferLike>; the actual value is fine at runtime.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await postJSON("/api/push/subscribe", { ...subscription.toJSON(), label: describeDevice(navigator.userAgent) });
      setStatus("subscribed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't enable reminders on this device.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await postJSON("/api/push/unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus("not-subscribed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't disable reminders on this device.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await postJSON("/api/push/test", {});
      // "Sent" here only means the push service accepted it — a real,
      // separate gotcha this session hit directly: the browser can report
      // Notification permission as "granted" while the OS/device's own
      // notification setting for that browser/app is still off, silently
      // swallowing the banner with no error anywhere. Worth a standing
      // hint rather than leaving "sent but nothing appeared" a mystery.
      setTestResult(
        `Sent to ${result.sent} device(s)${result.failed ? `, ${result.failed} failed` : ""}. Nothing show up? Check this device's own notification settings for the browser/app (separate from the permission you just granted).`
      );
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test send failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (status === "checking") return null;

  let primary: React.ReactNode;

  if (status === "subscribed") {
    // Once actually enabled on this device, the walkthrough has done its
    // job — collapse to a short confirmed line plus the two follow-up
    // actions, instead of still showing "how to get here."
    primary = (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, opacity: 0.75 }}>✓ Reminders enabled on this device.</span>
        <Button buttonStyle="secondary" size="medium" onClick={sendTest} disabled={busy}>
          Send test notification
        </Button>
        <Button buttonStyle="secondary" size="medium" onClick={disable} disabled={busy}>
          Disable
        </Button>
        {testResult && <span style={{ fontSize: 13, opacity: 0.75 }}>{testResult}</span>}
      </div>
    );
  } else if (!needsHomeScreenSteps) {
    // Android/desktop (or an iPhone already opened from its Home Screen
    // icon) needs none of the install steps — Push works directly in a
    // normal browser tab there, so just the action itself.
    if (status === "unsupported") {
      primary = (
        <p style={{ fontSize: 13, opacity: 0.75, margin: 0 }}>
          Push notifications aren&apos;t supported in this browser yet — try a recent Chrome, Edge, or Firefox.
        </p>
      );
    } else if (status === "denied") {
      primary = (
        <p style={{ fontSize: 13, opacity: 0.75, margin: 0 }}>
          Notifications are blocked for this site in your browser/phone settings — re-enable them there to turn
          reminders back on.
        </p>
      );
    } else {
      primary = (
        <Button buttonStyle="secondary" size="medium" onClick={enable} disabled={busy}>
          Enable reminders on this device
        </Button>
      );
    }
  } else {
    primary = (
      <ol style={stepListStyle}>
        <li style={stepTextStyle}>
          On your iPhone, open this admin in <strong>Safari</strong>.
        </li>
        <li style={stepTextStyle}>
          Tap the <strong>Share</strong> icon → <strong>Add to Home Screen</strong> → <strong>Add</strong>.
        </li>
        <li style={stepTextStyle}>
          Close Safari, then open the admin from that new <strong>Home Screen icon</strong> instead — reminders only
          work from there, not from a Safari tab.
        </li>
        <li style={stepTextStyle}>
          {status === "not-subscribed" && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <Button buttonStyle="secondary" size="medium" onClick={enable} disabled={busy}>
                Enable reminders on this device
              </Button>
            </div>
          )}
          {status === "unsupported" && (
            <span>Come back to this page once you&apos;ve done steps 1-3 above, then tap Enable.</span>
          )}
          {status === "denied" && (
            <span>
              Notifications are blocked for this site in your phone&apos;s Settings app — re-enable them there, then
              come back and tap Enable.
            </span>
          )}
        </li>
      </ol>
    );
  }

  return (
    <div>
      {primary}
      {/* Covers logging into /admin from a computer while actually wanting
          reminders on a phone — the detection above only ever describes
          *this* device, so without this, someone on a desktop would have
          no way to reach the setup steps for a different device at all.
          Plain <details>/<summary> (no extra state, works with no JS
          beyond what the page already ships) rather than another
          button+useState toggle — collapsed by default so it doesn't
          clutter the common case where the current device is already the
          right one. Covers Android/other computers too, not just iPhone —
          the two need genuinely different instructions (iPhone's Home
          Screen requirement vs. nothing at all), so both get their own
          short answer instead of just assuming "different device" means
          "another iPhone." */}
      {!needsHomeScreenSteps && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, color: "var(--theme-elevation-600, #666)", cursor: "pointer" }}>
            Want this on a different device?
          </summary>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <p style={{ ...stepTextStyle, fontWeight: 600, margin: "0 0 6px" }}>On an iPhone:</p>
              <ol style={stepListStyle}>
                <li style={stepTextStyle}>
                  On that iPhone, open this admin in <strong>Safari</strong>.
                </li>
                <li style={stepTextStyle}>
                  Tap the <strong>Share</strong> icon → <strong>Add to Home Screen</strong> → <strong>Add</strong>.
                </li>
                <li style={stepTextStyle}>
                  Close Safari, then open the admin from that new <strong>Home Screen icon</strong> instead —
                  reminders only work from there, not from a Safari tab.
                </li>
                <li style={stepTextStyle}>
                  Log in there and tap <strong>Enable reminders on this device</strong> — it&apos;ll show right on
                  that phone&apos;s dashboard, the same as here.
                </li>
              </ol>
            </div>
            <div>
              <p style={{ ...stepTextStyle, fontWeight: 600, margin: "0 0 6px" }}>On an Android phone or a computer:</p>
              <p style={{ ...stepTextStyle, margin: 0 }}>
                No extra setup needed — just open this admin there in any normal browser tab, log in, and tap{" "}
                <strong>Enable reminders on this device</strong>. Android/desktop don&apos;t have iPhone&apos;s Home
                Screen requirement.
              </p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
