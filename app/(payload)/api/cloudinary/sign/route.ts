import { NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";
import { v2 as cloudinary } from "cloudinary";

// Signature endpoint for next-cloudinary's <CldUploadWidget> (see
// components/admin/CloudinaryVideoStudio.tsx) — required because uploads
// are *signed*, not routed through an open unsigned upload preset. Anyone
// who found this URL could otherwise upload arbitrary files straight to our
// Cloudinary account with no login at all.
//
// Same auth pattern as app/(payload)/api/reorder/route.ts: only a logged-in
// Payload admin user gets a valid signature. Cloudinary's own API secret
// never reaches the browser — only the resulting signature does, which is
// worthless without the secret that produced it.
export async function POST(req: Request) {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { paramsToSign?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.paramsToSign || typeof body.paramsToSign !== "object") {
    return NextResponse.json({ error: "Missing paramsToSign" }, { status: 400 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not configured (CLOUDINARY_API_SECRET unset)" }, { status: 500 });
  }

  const signature = cloudinary.utils.api_sign_request(body.paramsToSign, apiSecret);
  return NextResponse.json({ signature });
}
