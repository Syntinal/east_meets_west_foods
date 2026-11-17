"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReviewView } from "@/lib/manage/reviewOps";
import { addReview, setReviewOnWebsite, updateReview } from "@/app/(manage)/manage/reviews/actions";
import { UndoBar } from "@/components/manage/UndoBar";

const STARS = [
  { value: "5", label: "★★★★★", words: "5 stars" },
  { value: "4", label: "★★★★", words: "4 stars" },
];

// Add (or fix) a customer review: find it on Google, paste the words, type
// the name, pick the stars, then one button puts it on the website.
export function ReviewEditor({ review, googleUrl }: { review: ReviewView | null; googleUrl: string }) {
  const [quote, setQuote] = useState(review?.quote ?? "");
  const [authorName, setAuthorName] = useState(review?.authorName ?? "");
  const [rating, setRating] = useState(review?.rating ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: number | string } | null>(null);

  // An older review might be 3 stars; keep showing that choice if so.
  const starChoices = rating === "3" ? [...STARS, { value: "3", label: "★★★", words: "3 stars" }] : STARS;

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const input = { quote, authorName, rating };
    const r = review ? await updateReview(review.id, input) : await addReview(input);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      window.scrollTo({ top: 0 });
      return;
    }
    setDone({ id: review ? review.id : (r as unknown as { id: number | string }).id });
    window.scrollTo({ top: 0 });
  }

  if (done) {
    return (
      <>
        <h1>{review ? "Review updated" : "Review added"}</h1>
        <UndoBar
          message={<strong>It&apos;s on the website now. ✓</strong>}
          onUndo={review ? undefined : () => setReviewOnWebsite(done.id, false)}
        />
        <div className="m-stack">
          {!review && (
            <a href="/manage/reviews/new" className="m-btn m-btn--primary m-btn--block">
              + Add another review
            </a>
          )}
          <Link href="/manage/reviews" className="m-btn m-btn--block">
            Back to reviews
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>{review ? "Change this review" : "Add a customer review"}</h1>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}

      {!review && (
        <div className="m-field">
          <span className="m-label">1. Find a good review on Google</span>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="m-btn m-btn--block">
            Open Google Reviews ↗
          </a>
          <p className="m-hint">It opens in a new tab. Copy the words of a review you like, then come back here.</p>
        </div>
      )}

      <label className="m-field">
        <span className="m-label">{review ? "The review's words" : "2. Paste the review's words here"}</span>
        <textarea className="m-input m-textarea" style={{ minHeight: 180 }} value={quote} onChange={(e) => setQuote(e.target.value)} />
      </label>

      <label className="m-field">
        <span className="m-label">{review ? "Customer's name" : "3. The customer's name"}</span>
        <span className="m-sublabel">First name and last initial is fine, like “Jane D.”</span>
        <input className="m-input" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
      </label>

      <div className="m-field">
        <span className="m-label">{review ? "Stars" : "4. How many stars?"}</span>
        <ul className="m-choices">
          {starChoices.map((s) => {
            const on = rating === s.value;
            return (
              <li key={s.value}>
                <button type="button" className={`m-choice ${on ? "m-choice--on" : ""}`} aria-pressed={on} onClick={() => setRating(s.value)}>
                  <span className="m-choice-mark" aria-hidden="true">
                    {on ? "✓" : ""}
                  </span>
                  <span>
                    <span className="m-choice-label m-stars">{s.label}</span>
                    <span className="m-choice-state">{s.words}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button type="button" className="m-btn m-btn--primary m-btn--block m-btn--tall" onClick={submit} disabled={busy}>
        {busy ? "One moment…" : review ? "Save and put on the website" : "Put it on the website"}
      </button>
    </>
  );
}
