"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { TestimonialsView, type TestimonialDoc, type TestimonialsIntroDoc } from "./TestimonialsView";

// Mirrors components/menu/LiveMenuIntro.tsx — testimonials-intro is a
// singleton Global like Menu Intro, so this can hand useLivePreview the
// fetched global doc directly. `testimonials` is just passed straight
// through, unedited, on this session (individual testimonials preview via
// LiveTestimonialsGrid.tsx, a separate session).
export function LiveTestimonialsIntro({
  testimonials,
  intro,
}: {
  testimonials: TestimonialDoc[];
  intro: TestimonialsIntroDoc;
}) {
  const { data } = useLivePreview<TestimonialsIntroDoc>({
    initialData: intro,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 0,
  });

  return <TestimonialsView testimonials={testimonials} intro={data} />;
}
