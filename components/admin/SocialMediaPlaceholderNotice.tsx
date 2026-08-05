import type { CSSProperties } from "react";

// Shown inline (via a `type: "ui"` field, see collections/News.ts) whenever
// a News post has `socialMedia.postToSocialMedia` checked. Purely
// informational — there's no real social media integration yet, so this
// just sets expectations instead of silently doing nothing. When real
// publishing is built, this is the component to swap for actual status
// (queued/posted/failed per platform, links to the live posts, etc.) —
// see the design note in collections/News.ts above the `socialMedia` field.
const boxStyle: CSSProperties = {
  border: "1px solid var(--theme-warning-500, #f5a623)",
  background: "var(--theme-warning-100, #fdf3e0)",
  borderRadius: 4,
  padding: "12px 16px",
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--theme-warning-800, #6b4a00)",
};

export function SocialMediaPlaceholderNotice() {
  return (
    <div style={boxStyle}>
      <strong>📣 Marked for social media</strong>
      <p style={{ margin: "4px 0 0" }}>
        This post is flagged to go out on social media. Automatic publishing isn't set up yet, so
        nothing will be posted anywhere — this is just a placeholder for now. Once social media
        integration is built, flagged posts like this one will be picked up and published
        automatically.
      </p>
    </div>
  );
}
