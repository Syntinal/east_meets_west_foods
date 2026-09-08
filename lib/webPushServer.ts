import webpush from "web-push";
import { getPayload } from "payload";
import config from "@payload-config";

// Server-only Web Push sending — used by app/(frontend)/next/cron/remind-post
// (the automatic reminder) and app/(payload)/api/push/test (the owner's own
// "send a test now" button). Never imported client-side: VAPID_PRIVATE_KEY
// must stay server-only, same posture as every other secret in this repo
// (Cloudinary's API secret, Post for Me's API key, etc.).
let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT must all be set to send push notifications.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

type SubscriptionDoc = {
  id: string | number;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Sends one payload to every currently-stored subscription
// (collections/PushSubscriptions.ts), deleting any subscription the push
// service reports as gone (404/410 — the standard "this endpoint will
// never work again" response, e.g. the owner removed the Home Screen app)
// so the list doesn't silently accumulate dead rows. Returns a plain
// summary rather than throwing — one bad subscription shouldn't stop the
// others from being notified.
export async function sendPushToAllSubscriptions(
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  ensureConfigured();
  const db = await getPayload({ config });
  const { docs } = await db.find({
    collection: "push-subscriptions",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    (docs as SubscriptionDoc[]).map(async (doc) => {
      try {
        await webpush.sendNotification(
          { endpoint: doc.endpoint, keys: doc.keys },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          removed += 1;
          await db.delete({ collection: "push-subscriptions", id: doc.id, overrideAccess: true }).catch(() => {});
        } else {
          failed += 1;
        }
      }
    })
  );

  return { sent, removed, failed };
}
