// Builds the URL Payload's admin "Preview" button opens — hits our
// /next/preview route, which enables Next.js Draft Mode and redirects to
// the actual page so an editor can see unpublished changes in context.
//
// `livePreviewId` (which item's Live Preview panel this is) travels as a
// separate param here rather than embedded in `path`'s query string,
// because Vercel strips searchParams during ISR bypass even when Draft
// Mode is enabled (https://github.com/vercel/next.js/issues/92562) — the
// /next/preview route instead stashes it in a cookie, which does survive.
export function getPreviewURL(path: string, livePreviewId?: string): string {
  const params = new URLSearchParams({
    secret: process.env.PREVIEW_SECRET || "",
    path,
  });
  if (livePreviewId) {
    params.set("livePreviewId", livePreviewId);
  }
  return `/next/preview?${params.toString()}`;
}
