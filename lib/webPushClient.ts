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
