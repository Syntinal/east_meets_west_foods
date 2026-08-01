"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { NewsPostView, type NewsDoc } from "./NewsPostView";

// One post per page, so unlike the menu/testimonials list views this can
// hand the hook the real initial doc directly — no merge-by-id needed.
export function LiveNewsPost({ initialData }: { initialData: NewsDoc }) {
  const { data } = useLivePreview<NewsDoc>({
    initialData,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <NewsPostView post={data} />;
}
