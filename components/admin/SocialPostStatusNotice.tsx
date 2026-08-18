"use client";

import type { CSSProperties } from "react";
import { useFormFields } from "@payloadcms/ui";

// Generalized replacement for the old FacebookPostStatusNotice — one
// component shared by Facebook/Instagram/TikTok (collections/News.ts),
// parameterized via `clientProps.platform` (a real Payload `ui` field
// component prop, see collections/News.ts's platformSocialFields())
// instead of 3 near-identical copies. Shown inline whenever a News post
// has the matching `socialMedia.postTo<Platform>` checked. Reads the
// status fields the afterChange hook (collections/News.ts) writes back
// after each attempt — already-loaded sibling form state via
// useFormFields, no extra network call needed, since these are plain
// fields on the doc itself.

type Platform = "facebook" | "instagram" | "tiktok";

const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Field paths this component reads, keyed by platform — mirrors
// PLATFORM_FIELDS in collections/News.ts exactly.
const STATUS_FIELD: Record<Platform, string> = {
  facebook: "socialMedia.facebookPostStatus",
  instagram: "socialMedia.instagramPostStatus",
  tiktok: "socialMedia.tikTokPostStatus",
};
const URL_FIELD: Record<Platform, string> = {
  facebook: "socialMedia.facebookPostUrl",
  instagram: "socialMedia.instagramPostUrl",
  tiktok: "socialMedia.tikTokPostUrl",
};
const ERROR_FIELD: Record<Platform, string> = {
  facebook: "socialMedia.facebookPostError",
  instagram: "socialMedia.instagramPostError",
  tiktok: "socialMedia.tikTokPostError",
};

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

export function SocialPostStatusNotice({ platform }: { platform: Platform }) {
  const label = PLATFORM_LABEL[platform];
  const status = useFormFields(([fields]) => fields[STATUS_FIELD[platform]]?.value as string | undefined);
  const url = useFormFields(([fields]) => fields[URL_FIELD[platform]]?.value as string | undefined);
  const error = useFormFields(([fields]) => fields[ERROR_FIELD[platform]]?.value as string | undefined);

  if (status === "posted") {
    return (
      <div style={successStyle}>
        <strong>✅ Posted to {label}</strong>
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
        <strong>⚠ Failed to post to {label}</strong>
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
        <strong>⚠ Failed to post to {label} after repeated attempts</strong>
        <p style={{ margin: "4px 0 0" }}>
          {error || "No error detail available."} This won&rsquo;t retry automatically — check the
          Post for Me account/API key, or the {label} connection in Post for Me, then uncheck and recheck
          this box to try again.
        </p>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <strong>📣 Marked for {label}</strong>
      <p style={{ margin: "4px 0 0" }}>Will post to {label} when this is published.</p>
    </div>
  );
}
