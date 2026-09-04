"use client";

import type { CSSProperties } from "react";
import { useFormFields } from "@payloadcms/ui";
import { MOCK_NOTE_PREFIX } from "@/lib/socialPostMock";

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
//
// Mock-mode results (no real POSTFORME_* credentials set for that platform
// yet — currently true for all 3, see CLAUDE.md) get a visibly distinct
// "test mode" treatment rather than the real green success / red failure
// boxes. Before this existed, a mock "success" rendered as an ordinary
// "✅ Posted to Facebook" with a real-looking "View the post ↗" link (to a
// fake, non-working URL) — the one honest disclaimer was a small line of
// text at the very bottom, easy to skim past under a headline and link
// that both read as a genuine success. A non-technical owner could easily
// believe posts were going out for real for as long as credentials stay
// unset. See lib/socialPostMock.ts for the MOCK_NOTE_PREFIX marker this
// keys off of.

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

// Deliberately neutral — neither the green "success" nor the amber/red
// "failed" styling — so a test result can never be mistaken for a real
// platform outcome at a glance, regardless of whether the simulated
// outcome itself was success or failure.
const mockStyle: CSSProperties = {
  ...boxStyle,
  border: "1px solid var(--theme-elevation-400)",
  background: "var(--theme-elevation-100)",
  color: "var(--theme-elevation-800)",
};

// Strips MOCK_NOTE_PREFIX back off for display, and reports whether it was
// there at all — the two things every branch below needs.
function readMockNote(text: string | undefined): { isMock: boolean; text: string | undefined } {
  if (text?.startsWith(MOCK_NOTE_PREFIX)) {
    return { isMock: true, text: text.slice(MOCK_NOTE_PREFIX.length) };
  }
  return { isMock: false, text };
}

export function SocialPostStatusNotice({ platform }: { platform: Platform }) {
  const label = PLATFORM_LABEL[platform];
  const status = useFormFields(([fields]) => fields[STATUS_FIELD[platform]]?.value as string | undefined);
  const url = useFormFields(([fields]) => fields[URL_FIELD[platform]]?.value as string | undefined);
  const rawError = useFormFields(([fields]) => fields[ERROR_FIELD[platform]]?.value as string | undefined);
  const { isMock, text: error } = readMockNote(rawError);

  if (status === "posted") {
    // A mock "success" gets its own box entirely — no green checkmark, and
    // no "View the post" link (the stored url is a fake placeholder in
    // mock mode too — see lib/socialPost.ts's MOCK_URL — clicking it
    // wouldn't go anywhere real).
    if (isMock) {
      return (
        <div style={mockStyle}>
          <strong>🧪 Test mode — not actually sent to {label}</strong>
          <p style={{ margin: "4px 0 0" }}>
            {error || `${label} isn't connected yet.`} Nothing changed on {label} itself.
          </p>
        </div>
      );
    }
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
      <div style={isMock ? mockStyle : boxStyle}>
        <strong>{isMock ? `🧪 Test mode — simulated a failed post to ${label}` : `⚠ Failed to post to ${label}`}</strong>
        <p style={{ margin: "4px 0 0" }}>
          {error || "No error detail available."} Will retry automatically next time this is saved
          while published — or uncheck and recheck this box to force a fresh attempt.
        </p>
      </div>
    );
  }

  if (status === "failed_permanent") {
    return (
      <div style={isMock ? mockStyle : boxStyle}>
        <strong>
          {isMock
            ? `🧪 Test mode — simulated a repeated failure posting to ${label}`
            : `⚠ Failed to post to ${label} after repeated attempts`}
        </strong>
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
