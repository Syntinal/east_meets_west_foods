"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { FaqView, type FaqDoc } from "./FaqView";

// FAQ is a singleton Global with no per-item id, so — like Home — this can
// hand the hook the real fetched doc directly; no merge-by-id needed.
export function LiveFaq({ faq }: { faq: FaqDoc }) {
  const { data } = useLivePreview<FaqDoc>({
    initialData: faq,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <FaqView faq={data} />;
}
