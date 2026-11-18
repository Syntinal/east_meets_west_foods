"use client";

import { useEffect, useState } from "react";
import {
  getThisDeviceReminderStatus,
  isIOSDevice,
  isStandaloneDisplay,
  sendTestReminder,
  turnOffRemindersForThisDevice,
  turnOnRemindersForThisDevice,
  type DeviceReminderStatus,
} from "@/lib/webPushClient";

// Turn "haven't posted in a while" reminders on/off for THIS phone. Uses the
// same shared steps and /api/push/* routes as the /admin dashboard button
// (lib/webPushClient.ts). On iPhone, notifications only work from a Home
// Screen icon, so that comes first when needed.
export function ReminderSetup() {
  const [status, setStatus] = useState<DeviceReminderStatus | "checking">("checking");
  // Decided after load (not during the first render) so the server-rendered
  // page and the phone's page always match.
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    setNeedsHomeScreen(isIOSDevice() && !isStandaloneDisplay());
    getThisDeviceReminderStatus().then(setStatus);
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch {
      setMessage({ text: "That didn't work. Check your internet connection and try again, or reach out for help.", error: true });
    }
    setBusy(false);
  }

  if (status === "checking") return <p>One moment…</p>;

  if (needsHomeScreen && status !== "subscribed") {
    return (
      <div className="m-card">
        <p className="m-card-title" style={{ fontSize: 20 }}>
          First, put this app on your Home Screen
        </p>
        <p style={{ margin: "6px 0 12px" }}>On an iPhone, reminders only work when you open this app from its Home Screen icon.</p>
        <ol className="m-steps">
          <li>
            Tap the <strong>Share</strong> button (the square with an arrow) at the bottom of Safari.
          </li>
          <li>
            Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
          <li>
            Open <strong>Website Helper</strong> from your Home Screen.
          </li>
          <li>
            Come back here and tap <strong>Turn on reminders</strong>.
          </li>
        </ol>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="m-notice">
        This phone or browser can&apos;t show reminders. On an iPhone, open this app from its Home Screen icon. Otherwise, reach
        out and we&apos;ll help.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="m-notice m-notice--warn">
        Notifications are turned off for this app. Open your phone&apos;s <strong>Settings</strong>, find this app (or your
        browser) under <strong>Notifications</strong>, turn them on, then come back here.
      </p>
    );
  }

  return (
    <>
      {message && (
        <div className={`m-notice ${message.error ? "m-notice--error" : "m-notice--good"}`} role="status">
          {message.text}
        </div>
      )}
      {status === "subscribed" ? (
        <>
          <p className="m-notice m-notice--good">
            <strong>✓ Reminders are on for this phone.</strong>
          </p>
          <button
            type="button"
            className="m-btn m-btn--block"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await sendTestReminder({ onlyThisDevice: true, url: "/manage/post" });
                setMessage({
                  text: "Sent! It should show up in a few seconds. If it doesn't, check that notifications are allowed for this app in your phone's Settings.",
                });
              })
            }
          >
            {busy ? "One moment…" : "🔔 Send me a test reminder"}
          </button>
          <p style={{ marginTop: 24 }}>
            <button
              type="button"
              className="m-textbtn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setStatus(await turnOffRemindersForThisDevice());
                  setMessage({ text: "Reminders are off for this phone." });
                })
              }
            >
              Turn off reminders on this phone
            </button>
          </p>
        </>
      ) : (
        <button
          type="button"
          className="m-btn m-btn--primary m-btn--block m-btn--tall"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const next = await turnOnRemindersForThisDevice();
              setStatus(next);
              if (next === "subscribed") setMessage({ text: "Done! Tap “Send me a test reminder” to try it." });
            })
          }
        >
          {busy ? "One moment…" : "🔔 Turn on reminders on this phone"}
        </button>
      )}
    </>
  );
}
