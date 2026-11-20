"use client";

import { useEffect, useRef, useState } from "react";

// Facebook's free "Page Plugin" (developers.facebook.com/docs/plugins/page-plugin)
// — an iframe Facebook itself serves, showing the Page's latest posts.
// Visitors don't need to be logged in to Facebook to see it. Used via the
// plain iframe form rather than Facebook's JS SDK, so no global script is
// loaded on the page.
//
// The plugin renders at a fixed pixel width (180–500, Facebook's own
// limits) taken from the URL — it does NOT reflow if the iframe is
// resized afterward. So this measures the container and builds the src
// from that width, re-measuring on resize.

const MIN_WIDTH = 180;
const MAX_WIDTH = 500;
const HEIGHT = 640;

/**
 * Facebook's Page Plugin accepts `profile.php?id=<id>` (and vanity
 * `facebook.com/<name>`) URLs, but renders nothing for the
 * `facebook.com/people/<name>/<id>/` form — which is the form currently
 * stored in the Navigation global's footer social link. Normalize that one
 * shape; pass anything else through unchanged. (Confirmed by requesting the
 * plugin with each form, Nov 2026.)
 */
export function toPagePluginHref(url: string): string {
  const match = url.match(/facebook\.com\/people\/[^/]+\/(\d+)/i);
  return match ? `https://www.facebook.com/profile.php?id=${match[1]}` : url;
}

export function FacebookPageFeed({ pageUrl }: { pageUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)));
    };
    measure();
    // Only rebuild the iframe when the clamped width actually changes —
    // every new src is a full reload of Facebook's plugin.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const params = new URLSearchParams({
    href: toPagePluginHref(pageUrl),
    tabs: "timeline",
    width: String(width ?? MAX_WIDTH),
    height: String(HEIGHT),
    small_header: "false",
    hide_cover: "false",
    show_facepile: "false",
    adapt_container_width: "true",
  });

  return (
    <div ref={containerRef} className="facebook-feed">
      {width !== null && (
        <iframe
          key={width}
          src={`https://www.facebook.com/plugins/page.php?${params.toString()}`}
          width={width}
          height={HEIGHT}
          title="Latest posts from our Facebook page"
          loading="lazy"
          style={{ border: "none", overflow: "hidden" }}
          allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
        />
      )}
      <p className="facebook-feed-fallback">
        <a href={pageUrl} target="_blank" rel="noopener noreferrer">
          See all our posts on Facebook ↗
        </a>
      </p>
    </div>
  );
}
