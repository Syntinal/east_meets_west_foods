"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { TestimonialsView, type TestimonialDoc } from "./TestimonialsView";

// The postMessage from the admin iframe only ever describes the ONE
// testimonial currently being edited, so splice it into the full,
// server-fetched list by id instead of replacing the list wholesale.
function mergeItem(items: TestimonialDoc[], live: Partial<TestimonialDoc>): TestimonialDoc[] {
  if (!live?.id) return items;
  return items.map((item) => (item.id === live.id ? ({ ...item, ...live } as TestimonialDoc) : item));
}

export function LiveTestimonialsGrid({
  initialItems,
  seedItem,
}: {
  initialItems: TestimonialDoc[];
  seedItem: TestimonialDoc;
}) {
  // `useLivePreview` needs a real, existing document to seed `initialData` —
  // it round-trips to `/api/testimonials/{initialData.id}` on every
  // keystroke, so an empty placeholder object 404s that request every time
  // and the merge silently never fires.
  const { data } = useLivePreview<TestimonialDoc>({
    initialData: seedItem,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
  });

  return <TestimonialsView testimonials={mergeItem(initialItems, data)} />;
}
