// pushManager.subscribe() needs the VAPID public key as a raw Uint8Array,
// not the base64url string it's actually distributed as
// (NEXT_PUBLIC_VAPID_PUBLIC_KEY) — this is the standard, widely-used
// conversion (browsers don't expose a built-in for it). Used only by
// components/admin/PushReminderButton.tsx.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// A plain, human-readable stand-in for the raw navigator.userAgent string
// (e.g. "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)...") —
// stored as PushSubscriptions' `label` field so a Master Admin sees
// "iPhone" or "Android phone" in the device list, not a technical UA
// blob. Not meant to be exhaustive device detection, just enough to tell
// devices apart at a glance; the field stays editable afterward for
// anyone who wants to rename an entry to something more specific.
export function describeDevice(userAgent: string): string {
  if (/iPad/.test(userAgent)) return "iPad";
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/Android/.test(userAgent)) return /Mobile/.test(userAgent) ? "Android phone" : "Android tablet";
  if (/Macintosh/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows PC";
  return "Device";
}

// ---------- Shared browser steps for turning reminders on/off ----------
// Used by both components/admin/PushReminderButton.tsx (/admin dashboard)
// and components/manage/ReminderSetup.tsx (/manage), so the two screens
// can't drift apart. All of them talk to the same /api/push/* routes.

export type DeviceReminderStatus = "unsupported" | "denied" | "subscribed" | "not-subscribed";

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // the signed-in session cookie (same one /admin and /manage use)
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request to ${url} failed (${res.status})`);
  return res.json();
}

export function isIOSDevice(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Opened from a Home Screen icon (required for notifications on iPhone). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function getThisDeviceReminderStatus(): Promise<DeviceReminderStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const existing = await registration.pushManager.getSubscription();
    return existing ? "subscribed" : "not-subscribed";
  } catch {
    return "unsupported";
  }
}

/** Asks permission, registers this device with the push service, and saves it. */
export async function turnOnRemindersForThisDevice(): Promise<DeviceReminderStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  await postJSON("/api/push/subscribe", { ...subscription.toJSON(), label: describeDevice(navigator.userAgent) });
  return "subscribed";
}

export async function turnOffRemindersForThisDevice(): Promise<DeviceReminderStatus> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await postJSON("/api/push/unsubscribe", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
  return "not-subscribed";
}

/**
 * Sends a test notification. With `onlyThisDevice`, only this device gets
 * it (not everyone who has reminders on). `url` is where tapping it goes.
 */
export async function sendTestReminder(options: { onlyThisDevice?: boolean; url?: string } = {}): Promise<{ sent: number; failed: number }> {
  let endpoint: string | undefined;
  if (options.onlyThisDevice) {
    const registration = await navigator.serviceWorker.ready;
    endpoint = (await registration.pushManager.getSubscription())?.endpoint;
    if (!endpoint) throw new Error("Reminders aren't turned on for this device.");
  }
  return postJSON("/api/push/test", endpoint || options.url ? { endpoint, url: options.url } : {});
}
