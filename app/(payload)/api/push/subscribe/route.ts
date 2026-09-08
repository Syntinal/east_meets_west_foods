import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";

// Called by components/admin/PushReminderButton.tsx right after a browser
// subscribes via pushManager.subscribe(). Same auth pattern as
// app/(payload)/api/reorder/route.ts — payload.auth() against the request's
// own cookies, then the Local API with overrideAccess: true (the
// collection's own access.create still requires authenticated for anyone
// hitting the REST/GraphQL API directly, but this route re-implements that
// check itself so it can decide what to do on failure, same reasoning as
// the reorder route's own comment).
//
// Upserts by endpoint rather than always creating — re-tapping "Enable" on
// a device that's already subscribed (e.g. after a permission reset) would
// otherwise leave duplicate rows for the same endpoint.
export async function POST(req: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { endpoint, keys, label } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 });
  }

  const existing = await payload.find({
    collection: "push-subscriptions",
    where: { endpoint: { equals: endpoint } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, label: label || "" };

  if (existing.docs.length > 0) {
    await payload.update({ collection: "push-subscriptions", id: existing.docs[0].id, data, overrideAccess: true });
  } else {
    await payload.create({ collection: "push-subscriptions", data, overrideAccess: true });
  }

  return NextResponse.json({ success: true });
}
