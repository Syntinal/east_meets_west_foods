"use client";

import { BANNER_PICKS, bannerUntil, type BannerPick } from "@/lib/manage/bannerChoices";

// "Show it at the top of your home page?" — one tap choices, no calendar.
// `currentEnd` adds a "Keep it until …" choice for a post that's already
// the banner with an end date.
export function BannerPicker({
  value,
  onChange,
  currentEnd,
}: {
  value: BannerPick;
  onChange: (v: BannerPick) => void;
  currentEnd?: string | null;
}) {
  const picks = currentEnd ? [BANNER_PICKS[0], { value: "keep" as const, label: `Keep it until ${bannerUntil(currentEnd)}` }, ...BANNER_PICKS.slice(1)] : BANNER_PICKS;
  return (
    <ul className="m-choices m-choices--compact">
      {picks.map((p) => {
        const on = value === p.value;
        return (
          <li key={String(p.value)}>
            <button type="button" className={`m-choice ${on ? "m-choice--on" : ""}`} aria-pressed={on} onClick={() => onChange(p.value)}>
              <span className="m-choice-mark" aria-hidden="true">
                {on ? "✓" : ""}
              </span>
              <span className="m-choice-label">{p.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
