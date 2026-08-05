"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { PageView, type PageDoc } from "./PageView";

// One page per URL, so — like LiveNewsPost — this can hand the hook the
// real initial doc directly, no merge-by-id needed.
export function LivePage({ initialData }: { initialData: PageDoc }) {
  const { data } = useLivePreview<PageDoc>({
    initialData,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <PageView page={data} />;
}
