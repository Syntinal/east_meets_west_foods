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
  //
  // Always set-or-clear (never "leave whatever was there"): this cookie is
  // shared across every preview session in the browser, not scoped to one
  // admin doc. Without the explicit delete, opening a preview that doesn't
  // pass a livePreviewId (e.g. globals/MenuIntro, which previews /menu just
  // like a Menu Item does) could inherit a stale id left over from a
  // previous Menu Item preview — on /menu that decides which Live Preview
  // component mounts, and only one useLivePreview subscription should ever
  // be active per session (see components/menu/LiveMenuIntro.tsx).
  const cookieStore = await cookies();
  if (livePreviewId) {
    cookieStore.set("live-preview-id", livePreviewId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete("live-preview-id");
  }

  redirect(path);
}
