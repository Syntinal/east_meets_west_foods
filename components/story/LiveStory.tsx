"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { StoryView, type StoryDoc } from "./StoryView";

// Story is a singleton Global with no per-item id, so — like Home — this
// can hand the hook the real fetched doc directly; no merge-by-id needed.
export function LiveStory({ story }: { story: StoryDoc }) {
  const { data } = useLivePreview<StoryDoc>({
    initialData: story,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <StoryView story={data} />;
}
