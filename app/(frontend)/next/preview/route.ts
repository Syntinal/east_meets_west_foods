import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");
  const livePreviewId = searchParams.get("livePreviewId");

  if (!secret || secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  if (!path || !path.startsWith("/")) {
    return new Response("Invalid path", { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  // Cookies survive Vercel's ISR bypass in a way query strings don't (see
  // getPreviewURL) — this is how the Live Preview panel tells the page
  // which item's data to seed, without relying on searchParams.
  if (livePreviewId) {
    const cookieStore = await cookies();
    cookieStore.set("live-preview-id", livePreviewId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  redirect(path);
}
