"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { HomeView, type HomeDoc, type BannerDoc, type TestimonialDoc } from "./HomeView";

// Home is a singleton Global with no per-item id, so — like News' single-doc
// page — this can hand the hook the real fetched doc directly, no
// merge-by-id needed the way the menu/testimonials list views require.
export function LiveHome({
  home,
  banner,
  showNewsTeaser,
  testimonials,
}: {
  home: HomeDoc;
  banner: BannerDoc | null;
  showNewsTeaser: boolean;
  testimonials: TestimonialDoc[];
}) {
  const { data } = useLivePreview<HomeDoc>({
    initialData: home,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <HomeView home={data} banner={banner} showNewsTeaser={showNewsTeaser} testimonials={testimonials} />;
}
