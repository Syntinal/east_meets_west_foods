"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReviewView } from "@/lib/manage/reviewOps";
import { setReviewOnWebsite } from "@/app/(manage)/manage/reviews/actions";

const stars = (rating: string) => "★".repeat(Number(rating) || 0);

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  const [onWebsite, setOnWebsite] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(reviews.map((r) => [String(r.id), r.onWebsite])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  async function toggle(r: ReviewView) {
    const key = String(r.id);
    const next = !onWebsite[key];
    if (!next && !confirm(`Take the review from ${r.authorName} off the website? You can put it back any time.`)) return;
    setBusy(key);
    setNotice(null);
    const res = await setReviewOnWebsite(r.id, next);
    setBusy(null);
    if (res.ok) {
      setOnWebsite((s) => ({ ...s, [key]: next }));
      setNotice({ text: next ? `The review from ${r.authorName} is back on the website.` : `The review from ${r.authorName} is off the website. Tap “Put it back” to undo.` });
    } else {
      setNotice({ text: res.message, error: true });
    }
  }

  return (
    <>
      <Link href="/manage/reviews/new" className="m-btn m-btn--primary m-btn--block m-btn--tall" style={{ marginBottom: 16 }}>
        + Add a review
      </Link>
      {notice && (
        <div className={`m-notice ${notice.error ? "m-notice--error" : "m-notice--good"}`} role="status">
          {notice.text}
        </div>
      )}
      {reviews.length === 0 && <p className="m-notice">No reviews yet.</p>}
      <ul className="m-cards">
        {reviews.map((r) => {
          const key = String(r.id);
          const live = onWebsite[key];
          return (
            <li key={key} className="m-card">
              <p className="m-stars" aria-label={`${r.rating} stars`}>
                {stars(r.rating)}
              </p>
              <p className="m-review-quote">“{r.quote}”</p>
              <p className="m-card-sub">— {r.authorName}</p>
              <p className="m-badges">
                {live ? (
                  <span className="m-badge m-badge--good">On the website</span>
                ) : (
                  <span className="m-badge m-badge--warn">Not on the website</span>
                )}
              </p>
              <div className="m-card-actions">
                <Link href={`/manage/reviews/${r.id}`} className="m-btn">
                  ✏️ Change
                </Link>
                <button type="button" className="m-btn" disabled={busy === key} onClick={() => toggle(r)}>
                  {busy === key ? "One moment…" : live ? "Take off the website" : "↶ Put it back"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
