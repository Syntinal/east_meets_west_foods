// Service worker for the admin's "haven't posted in a while" push
// reminder (see components/admin/PushReminderButton.tsx,
// app/(frontend)/next/cron/remind-post/route.ts). Deliberately minimal —
// no offline caching, no asset precaching, nothing else this site needs a
// service worker for. Registered from /sw.js (root scope) so it can
// receive push events regardless of which route the browser happened to
// register it from.
//
// Plain static file in /public, served at whatever origin the site is on
// (dev or the real deployment) — no build step touches this file.
//
// skipWaiting()/clients.claim(): without these, a browser tab left open
// across an edit to this file (this session edited it a few times) leaves
// the OLD service worker version "active" and the new one stuck "waiting"
// until every such tab closes — meaning a push could silently be handled
// by a stale worker instance instead of whatever this file currently
// says. These force every update to take over immediately instead.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not JSON (or no body) — fall back to the defaults below rather than
    // failing the whole push.
  }

  const title = data.title || "East Meets West Foods";
  const options = {
    body: data.body || "",
    icon: "/assets/bao_bun.png",
    badge: "/assets/bao_bun.png",
    data: { url: data.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an already-open admin tab/window if one
// exists, rather than always opening a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
