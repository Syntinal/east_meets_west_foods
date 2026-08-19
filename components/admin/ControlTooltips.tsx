"use client";

import { useEffect } from "react";

// Payload's document-control row (Live Preview eye icon, Preview link,
// Publish, Save draft) ships with only short native `title` attributes
// (e.g. "Preview", "Live Preview") — same word as the visible label, no
// explanation of what happens when you click. None of these are icon/button
// components exposed for swizzling via collection config, so this patches
// their `title`/`aria-label` directly by the stable DOM ids Payload renders
// them with. A MutationObserver re-applies after re-renders, since the
// Live Preview toggler rewrites its own title/class every time it's clicked.
const TOOLTIPS: Record<string, string | ((el: Element) => string)> = {
  "preview-button": "Preview — opens this page in a new tab so you can see how it looks. Nothing is published; visitors can't see this.",
  "live-preview-toggler": (el) =>
    el.classList.contains("live-preview-toggler--active")
      ? "Exit Live Preview — closes the live preview panel and returns to the normal editing view."
      : "Live Preview — shows a live preview of this page next to your edits, updating as you type. Nothing is published.",
  "action-save": "Publish — makes your changes visible to visitors on the live website.",
  "action-save-draft": "Save draft — saves your changes so you don't lose them, without making them visible to visitors yet.",
};

// The "Versions" tab (Payload's native version-history view, already on by
// default whenever `versions.drafts` is enabled — see
// node_modules/@payloadcms/next/dist/elements/DocumentHeader/Tabs/tabs/index.js)
// has no explanation anywhere that it's also how you undo a mistake: open an
// older version, click Restore. It has no stable id like the buttons above
// (it's a plain link with class "doc-tab"), so it's matched by its href
// suffix instead — every document's Versions tab links to `<doc url>/versions`.
const VERSIONS_TAB_TOOLTIP =
  "Versions — see every earlier saved version of this page. Made a mistake and already published it? Open an older version here and click Restore to bring it back.";

function applyVersionsTabTooltip() {
  const links = document.querySelectorAll('a.doc-tab[href$="/versions"]');
  for (const el of links) {
    if (el.getAttribute("title") !== VERSIONS_TAB_TOOLTIP) el.setAttribute("title", VERSIONS_TAB_TOOLTIP);
    if (el.getAttribute("aria-label") !== VERSIONS_TAB_TOOLTIP) el.setAttribute("aria-label", VERSIONS_TAB_TOOLTIP);
  }
}

function applyTooltips() {
  for (const [id, text] of Object.entries(TOOLTIPS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const value = typeof text === "function" ? text(el) : text;
    if (el.getAttribute("title") !== value) el.setAttribute("title", value);
    if (el.getAttribute("aria-label") !== value) el.setAttribute("aria-label", value);
  }
  applyVersionsTabTooltip();
}

export function ControlTooltips() {
  useEffect(() => {
    applyTooltips();
    const observer = new MutationObserver(applyTooltips);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
