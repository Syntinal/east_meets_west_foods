"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { SauceView, type SauceDoc } from "./SauceView";

// Sauce is a singleton Global with no per-item id, so — like Home — this
// can hand the hook the real fetched doc directly; no merge-by-id needed
// the way the menu/testimonials list views require.
export function LiveSauce({ sauce }: { sauce: SauceDoc }) {
  const { data } = useLivePreview<SauceDoc>({
    initialData: sauce,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <SauceView sauce={data} />;
}
