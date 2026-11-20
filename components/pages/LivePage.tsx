"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { PageView, type PageDoc } from "./PageView";
import type { HoursContext } from "./StoreHoursTable";

// One page per URL, so — like LiveNewsPost — this can hand the hook the
// real initial doc directly, no merge-by-id needed.
export function LivePage({ initialData, hours }: { initialData: PageDoc; hours?: HoursContext }) {
  const { data } = useLivePreview<PageDoc>({
    initialData,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <PageView page={data} hours={hours} />;
}
