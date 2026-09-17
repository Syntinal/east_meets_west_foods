"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { HomeView, type HomeDoc, type BannerDoc, type TestimonialDoc, type TeaserNavLabels } from "./HomeView";
import type { LatestNewsPost } from "./TeaserCards";

// Home is a singleton Global with no per-item id, so — like News' single-doc
// page — this can hand the hook the real fetched doc directly, no
// merge-by-id needed the way the menu/testimonials list views require.
export function LiveHome({
  home,
  banner,
  latestNewsPost,
  testimonials,
  navLabels,
}: {
  home: HomeDoc;
  banner: BannerDoc | null;
  // Sourced from the News collection, not Home — not part of this hook's
  // tracked doc, so it's passed straight through rather than live-synced
  // (editing a News post is its own separate Live Preview session, on
  // /news/[slug] — see components/news/LiveNewsPost.tsx).
  latestNewsPost: LatestNewsPost;
  testimonials: TestimonialDoc[];
  // Sourced from the Navigation global, not Home — not part of this hook's
  // tracked doc, so it's passed straight through rather than live-synced
  // (the owner would need to be live-previewing Navigation, not Home, for
  // it to change anyway).
  navLabels: TeaserNavLabels;
}) {
  const { data } = useLivePreview<HomeDoc>({
    initialData: home,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return (
    <HomeView
      home={data}
      banner={banner}
      latestNewsPost={latestNewsPost}
      testimonials={testimonials}
      navLabels={navLabels}
    />
  );
}
