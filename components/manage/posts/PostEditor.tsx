"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PostSummary, PostUndo } from "@/lib/manage/postsOps";
import { bannerChoiceOf, bannerUntil, postDate, type BannerPick } from "@/lib/manage/bannerChoices";
import { removePost, restorePost, undoPostChange, updatePost } from "@/app/(manage)/manage/posts/actions";
import { UndoBar } from "@/components/manage/UndoBar";
import { BannerPicker } from "./BannerPicker";

// One earlier post: fix its words, choose whether it's the banner at the
// top of the home page, or take it off the website. Changes go on the
// website when the owner taps the one "Update the post" button (there's no
// separate draft step for a post that's already up) — with Undo after.

const startPick = (p: PostSummary): BannerPick => (!p.banner.on ? "off" : p.banner.until ? "keep" : "always");

export function PostEditor({ post: initial }: { post: PostSummary }) {
  const [post, setPost] = useState(initial);
  const [message, setMessage] = useState(initial.message);
  const [pick, setPick] = useState<BannerPick>(startPick(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PostUndo | null>(null);
  const [removed, setRemoved] = useState<"removed" | "restored" | null>(null);

  const changed = message.trim() !== post.message.trim() || pick !== startPick(post);

  useEffect(() => {
    if (!changed) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [changed]);

  async function save() {
    if (busy || !changed) return;
    setBusy(true);
    setError(null);
    const r = await updatePost({ id: post.id, message, banner: bannerChoiceOf(pick) });
    setBusy(false);
    window.scrollTo({ top: 0 });
    if (!r.ok) return setError(r.message);
    setSaved(r.undo);
    if (r.post) {
      setPost(r.post);
      setMessage(r.post.message);
      setPick(startPick(r.post));
    }
  }

  async function takeDown() {
    if (!confirm("Take this post off your website? You can bring it back later from “Posts you took down”.")) return;
    setBusy(true);
    setError(null);
    const r = await removePost(post.id);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setRemoved("removed");
    window.scrollTo({ top: 0 });
  }

  if (removed) {
    return (
      <>
        <h1>{removed === "removed" ? "The post is off your website" : "The post is back on your website ✓"}</h1>
        {removed === "removed" && (
          <p className="m-intro">
            It&apos;s gone from your News page and home page. Anything already on Facebook, Instagram or TikTok stays there — remove
            it in those apps if you need to.
          </p>
        )}
        {error && (
          <div className="m-notice m-notice--error" role="alert">
            {error}
          </div>
        )}
        <div className="m-stack">
          {removed === "removed" && (
            <button
              type="button"
              className="m-btn m-btn--block"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await restorePost(post.id);
                setBusy(false);
                if (r.ok) setRemoved("restored");
                else setError(r.message);
              }}
            >
              {busy ? "One moment…" : "↶ Oops — put it back"}
            </button>
          )}
          <Link href="/manage/posts" className="m-btn m-btn--primary m-btn--block">
            Back to your posts
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="m-step-count">Posted {postDate(post.date)}</p>
      <h1>Your post</h1>

      {saved && (
        <UndoBar
          message={
            <>
              <strong>Done — the post on your website is updated.</strong>
            </>
          }
          onUndo={async () => {
            const r = await undoPostChange(saved);
            if (r.ok) setTimeout(() => window.location.reload(), 1200);
            return r;
          }}
        >
          <a href={post.sitePath} target="_blank" rel="noopener" className="m-btn m-btn--block" style={{ marginTop: 12 }}>
            See it on the website
          </a>
        </UndoBar>
      )}

      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}

      {post.thumbUrl && (
        <div className="m-preview-card">
          <img src={post.thumbUrl} alt="" />
          {post.hasVideo && (
            <p className="m-hint" style={{ padding: "8px 16px", margin: 0 }}>
              🎬 This post has a video.
            </p>
          )}
        </div>
      )}

      <p className="m-hint">
        <strong>Went to:</strong> Website{post.social.map((s) => `, ${s}`).join("")}
      </p>

      <label className="m-field">
        <span className="m-label">The words</span>
        <textarea className="m-input m-textarea" style={{ minHeight: 180 }} value={message} onChange={(e) => setMessage(e.target.value)} />
        <span className="m-hint">
          This changes the post on your website{post.hasVideo ? " (and the words on its video there)" : ""}. Facebook, Instagram and
          TikTok keep the words they already have.
        </span>
      </label>

      <div className="m-field">
        <span className="m-label">Show it at the top of your home page?</span>
        <span className="m-sublabel">
          {post.banner.on
            ? post.banner.until
              ? `It's there now, until ${bannerUntil(post.banner.until)}.`
              : "It's there now."
            : "Only one post shows there at a time."}
        </span>
        <BannerPicker value={pick} onChange={setPick} currentEnd={post.banner.on ? post.banner.until : null} />
      </div>

      <div className="m-save-area">
        <button type="button" className="m-btn m-btn--primary m-btn--block m-save" onClick={save} disabled={busy || !changed}>
          {busy ? "Saving…" : "Update the post on the website"}
        </button>
        <a href={post.sitePath} target="_blank" rel="noopener" className="m-textbtn m-textbtn--center">
          See the post as it is now
        </a>
      </div>

      <div style={{ marginTop: 40 }}>
        <button type="button" className="m-btn m-btn--block m-btn--danger" onClick={takeDown} disabled={busy}>
          Take this post off the website
        </button>
      </div>
    </>
  );
}
