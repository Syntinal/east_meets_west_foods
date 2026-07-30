// Builds the URL Payload's admin "Preview" button opens — hits our
// /next/preview route, which enables Next.js Draft Mode and redirects to
// the actual page so an editor can see unpublished changes in context.
export function getPreviewURL(path: string): string {
  const params = new URLSearchParams({
    secret: process.env.PREVIEW_SECRET || "",
    path,
  });
  return `/next/preview?${params.toString()}`;
}
