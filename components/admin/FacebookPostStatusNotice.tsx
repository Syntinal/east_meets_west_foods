"use client";

import type { CSSProperties } from "react";
import { useFormFields } from "@payloadcms/ui";

// Shown inline (via a `type: "ui"` field, see collections/News.ts) whenever
// a News post has `socialMedia.postToFacebook` checked. Reads the status
// fields the afterChange hook (collections/News.ts) writes back after each
// attempt — already-loaded sibling form state via useFormFields, no extra
// network call needed, since these are plain fields on the doc itself.
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

const successStyle: CSSProperties = {
  ...boxStyle,
  border: "1px solid var(--theme-success-500, #4caf50)",
  background: "var(--theme-success-100, #e8f5e9)",
  color: "var(--theme-success-800, #1b5e20)",
};

export function FacebookPostStatusNotice() {
  const status = useFormFields(([fields]) => fields["socialMedia.facebookPostStatus"]?.value as string | undefined);
  const url = useFormFields(([fields]) => fields["socialMedia.facebookPostUrl"]?.value as string | undefined);
  const error = useFormFields(([fields]) => fields["socialMedia.facebookPostError"]?.value as string | undefined);

  if (status === "posted") {
    return (
      <div style={successStyle}>
        <strong>✅ Posted to Facebook</strong>
        {url && (
          <p style={{ margin: "4px 0 0" }}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              View the post ↗
            </a>
          </p>
        )}
        {error && <p style={{ margin: "4px 0 0" }}>{error}</p>}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={boxStyle}>
        <strong>⚠ Failed to post to Facebook</strong>
        <p style={{ margin: "4px 0 0" }}>
          {error || "No error detail available."} Will retry automatically next time this is saved
          while published — or uncheck and recheck this box to force a fresh attempt.
        </p>
      </div>
    );
  }

  if (status === "failed_permanent") {
    return (
      <div style={boxStyle}>
        <strong>⚠ Failed to post to Facebook after repeated attempts</strong>
        <p style={{ margin: "4px 0 0" }}>
          {error || "No error detail available."} This won&rsquo;t retry automatically — check the
          Upload-Post account/API key, or the Facebook Page connection, then uncheck and recheck
          this box to try again.
        </p>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <strong>📣 Marked for Facebook</strong>
      <p style={{ margin: "4px 0 0" }}>Will post to Facebook when this is published.</p>
    </div>
  );
}
