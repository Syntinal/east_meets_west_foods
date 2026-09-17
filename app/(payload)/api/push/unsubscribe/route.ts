import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";

// Mirror of subscribe/route.ts — called when the owner taps "Disable" in
// components/admin/PushReminderButton.tsx. Deletes by endpoint rather than
// id, since the client only ever has the browser's own subscription object
// (which carries the endpoint), not this collection's document id.
export async function POST(req: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await payload.delete({
    collection: "push-subscriptions",
    where: { endpoint: { equals: body.endpoint } },
    overrideAccess: true,
  });

  return NextResponse.json({ success: true });
}
