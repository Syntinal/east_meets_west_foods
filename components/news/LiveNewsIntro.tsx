"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { NewsListView, type NewsListDoc, type NewsIntroDoc } from "./NewsListView";

// Mirrors components/menu/LiveMenuIntro.tsx — news-intro is a singleton
// Global like Menu Intro, so this can hand useLivePreview the fetched
// global doc directly. `posts` is just passed straight through, unedited,
// on this session (individual News posts preview on their own
// /news/[slug] page, not here — see components/news/LiveNewsPost.tsx).
export function LiveNewsIntro({ posts, intro }: { posts: NewsListDoc[]; intro: NewsIntroDoc }) {
  const { data } = useLivePreview<NewsIntroDoc>({
    initialData: intro,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 0,
  });

  return <NewsListView posts={posts} intro={data} />;
}
