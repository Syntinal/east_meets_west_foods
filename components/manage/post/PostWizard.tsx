"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compressPhoto, PhotoTooLargeError, PhotoUnreadableError, uploadPhoto } from "@/lib/manage/compressImage";
import { draftStore } from "@/lib/manage/draftStore";
import { findPostProblems } from "@/lib/manage/postValidation";
import type { PostablePlatform } from "@/lib/manage/platforms";
import type { SocialPlatform } from "@/lib/socialPost";
import { retryPost, submitPost, type Destination, type PostOutcome } from "@/app/(manage)/manage/post/actions";
import { uploadVideo, videoPosterUrl } from "@/lib/manage/uploadVideo";
import { reportUploadProblem } from "@/app/(manage)/manage/activity/actions";
import { captionFromMessage, MAX_VIDEO_BYTES, pickTrackId, trackPublicId } from "@/lib/manage/videoChoices";
import { buildCaptionFramePreviewUrl, buildOverlayVideoUrl } from "@/lib/cloudinaryVideo";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type Step = "photo" | "message" | "where" | "check";
const STEPS: Step[] = ["photo", "message", "where", "check"];

type Draft = {
  submissionKey: string;
  step: Step;
  message: string;
  platforms: SocialPlatform[];
  photo: { blob: Blob; mediaId: number | string | null } | null;
  /** Already uploaded to Cloudinary — only its id is kept (a video is too big to store on the device). */
  video: { publicId: string; durationSeconds: number | null } | null;
  /** The one question asked about a video. null = not answered yet. */
  withMusic: boolean | null;
};

const DRAFT_KEY = "post";

// crypto.randomUUID() only exists on https/localhost; getRandomValues works
// everywhere (e.g. a phone testing against this Mac over Wi-Fi via plain http).
function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function freshDraft(platforms: PostablePlatform[]): Draft {
  return {
    submissionKey: newKey(),
    step: "photo",
    message: "",
    // Every connected destination starts switched on.
    platforms: platforms.map((p) => p.platform),
    photo: null,
    video: null,
    withMusic: null,
  };
}

export function PostWizard({ platforms, helpName }: { platforms: PostablePlatform[]; helpName: string }) {
  const [phase, setPhase] = useState<"loading" | "resume" | "editing" | "posting" | "done">("loading");
  const [draft, setDraft] = useState<Draft>(() => freshDraft(platforms));
  const [photoState, setPhotoState] = useState<"idle" | "preparing" | "uploading" | "upload-failed">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; signedOut?: boolean } | null>(null);
  const [outcome, setOutcome] = useState<Extract<PostOutcome, { ok: true }> | null>(null);
  const [retrying, setRetrying] = useState(false);
  const postingRef = useRef(false);
  const takeInput = useRef<HTMLInputElement>(null);
  const chooseInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [videoState, setVideoState] = useState<"idle" | "uploading" | "failed">("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  // Kept in memory (not on the device) so a failed upload can be retried.
  const videoFile = useRef<File | null>(null);

  // ----- Recovery: load an unfinished post from this device -----
  // Runs ONCE, when the screen first opens. It used to re-run whenever the
  // `platforms` prop changed identity — and every save refreshes the page's
  // server data, handing in a new (equal) array. Right after "Post it" that
  // re-run replaced the "Your post is up!" screen with the check step, so
  // the owner had to tap Post it a second time (found testing on a phone).
  const recoveryDone = useRef(false);
  useEffect(() => {
    if (recoveryDone.current) return;
    recoveryDone.current = true;
    draftStore.get<Draft>(DRAFT_KEY).then((saved) => {
      if (saved && (saved.message.trim() || saved.photo || saved.video)) {
        const offered = new Set(platforms.map((p) => p.platform));
        setDraft({
          ...saved,
          video: saved.video ?? null,
          withMusic: saved.withMusic ?? null,
          platforms: saved.platforms.filter((p) => offered.has(p)),
        });
        setPhase("resume");
      } else {
        setPhase("editing");
      }
    });
    // No cleanup/cancel: the ref keeps this to a single run (including
    // React's development double-mount), and that single run must be allowed
    // to finish or the screen would stay on "One moment…".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Save the unfinished post on every change -----
  useEffect(() => {
    if (phase !== "editing") return;
    const t = setTimeout(() => void draftStore.set(DRAFT_KEY, draft), 300);
    return () => clearTimeout(t);
  }, [draft, phase]);

  const previewUrl = useMemo(() => (draft.photo ? URL.createObjectURL(draft.photo.blob) : null), [draft.photo]);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const goTo = (step: Step) => {
    update({ step });
    window.scrollTo({ top: 0 });
  };

  const upload = useCallback(async (blob: Blob) => {
    setPhotoState("uploading");
    setPhotoError(null);
    try {
      const { id } = await uploadPhoto(blob);
      setDraft((d) => (d.photo?.blob === blob ? { ...d, photo: { blob, mediaId: id } } : d));
      setPhotoState("idle");
    } catch {
      setPhotoState("upload-failed");
      setPhotoError("The photo didn't upload. Check your internet connection, then tap Try again.");
      void reportUploadProblem("photo").catch(() => {});
    }
  }, []);

  async function onPhotoPicked(file: File | undefined) {
    if (!file) return;
    setPhotoState("preparing");
    setPhotoError(null);
    let blob: Blob;
    try {
      blob = await compressPhoto(file);
    } catch (err) {
      setPhotoState("idle");
      setPhotoError(
        err instanceof PhotoTooLargeError
          ? "This photo is too large. Please choose a different one."
          : err instanceof PhotoUnreadableError
            ? "This photo couldn't be opened. Please choose a different one."
            : "Something went wrong with this photo. Please choose a different one.",
      );
      return;
    }
    update({ photo: { blob, mediaId: null }, video: null, withMusic: null });
    await upload(blob);
  }

  async function sendVideo(file: File) {
    setVideoState("uploading");
    setVideoProgress(0);
    setVideoError(null);
    try {
      const uploaded = await uploadVideo(file, setVideoProgress);
      videoFile.current = null;
      setDraft((d) => ({ ...d, photo: null, video: uploaded, withMusic: null }));
      setVideoState("idle");
    } catch {
      setVideoState("failed");
      setVideoError("The video didn't upload. Check your internet connection, then tap Try again.");
      void reportUploadProblem("video").catch(() => {});
    }
  }

  function onVideoPicked(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError("This video is too long to upload. Please use a shorter one — under about a minute works best.");
      return;
    }
    videoFile.current = file;
    setPhotoError(null);
    void sendVideo(file);
  }

  function removeMedia() {
    update({ photo: null, video: null, withMusic: null });
    setPhotoState("idle");
    setPhotoError(null);
    setVideoState("idle");
    setVideoError(null);
    videoFile.current = null;
  }

  const chosen = platforms.filter((p) => draft.platforms.includes(p.platform));
  const problems = findPostProblems({
    message: draft.message,
    hasPhoto: Boolean(draft.photo),
    videoSeconds: draft.video ? draft.video.durationSeconds : undefined,
    platforms: chosen,
  });
  const photoBusy =
    photoState === "preparing" ||
    photoState === "uploading" ||
    videoState !== "idle" ||
    Boolean(draft.video && draft.withMusic === null);

  // What the finished video will be — the exact same URL the website and
  // the social post use (built the same way on the server). Cloudinary only
  // makes it when someone actually presses play (preload="none").
  const videoPreview = useMemo(() => {
    if (!draft.video || !CLOUD_NAME) return null;
    const caption = captionFromMessage(draft.message);
    const music = draft.withMusic ? trackPublicId(pickTrackId(draft.submissionKey)) : null;
    return {
      src: buildOverlayVideoUrl({
        cloudName: CLOUD_NAME,
        publicId: draft.video.publicId,
        overlayText: caption,
        durationSeconds: draft.video.durationSeconds,
        musicPublicId: music,
        audioMode: "replace",
      }),
      poster: buildCaptionFramePreviewUrl({ cloudName: CLOUD_NAME, publicId: draft.video.publicId, overlayText: caption }),
    };
  }, [draft.video, draft.withMusic, draft.message, draft.submissionKey]);

  // True while the photo/video is still being prepared or uploaded.
  const mediaUploading = photoState === "preparing" || photoState === "uploading" || videoState === "uploading";
  const mediaFailed = photoState === "upload-failed" || videoState === "failed";
  // Tapping "Post it" while the photo is still saving doesn't do nothing
  // (which felt like having to tap twice on a real phone) — it waits, says
  // so, and posts by itself the moment the photo is ready.
  const [waitingToPost, setWaitingToPost] = useState(false);

  async function postIt() {
    if (postingRef.current) return; // a double tap never sends twice
    if (problems.length > 0) return;
    if (mediaFailed) {
      setSubmitError({ message: "Your photo or video didn't finish uploading. Tap “Change the photo” and then Try again." });
      return;
    }
    if (mediaUploading || (draft.photo && !draft.photo.mediaId)) {
      setWaitingToPost(true);
      return;
    }
    setWaitingToPost(false);
    postingRef.current = true;
    setSubmitError(null);
    setPhase("posting");
    try {
      const result = await submitPost({
        submissionKey: draft.submissionKey,
        message: draft.message,
        imageId: draft.video ? null : (draft.photo?.mediaId ?? null),
        video: draft.video ? { ...draft.video, withMusic: Boolean(draft.withMusic) } : null,
        platforms: draft.platforms,
      });
      if (result.ok) {
        setOutcome(result);
        setPhase("done");
        // It's on the website now, so the copy on this device isn't needed.
        await draftStore.remove(DRAFT_KEY);
      } else {
        setSubmitError({ message: result.message, signedOut: result.signedOut });
        setPhase("editing");
      }
    } catch {
      // Same one-time code on the next tap, so trying again can't double-post.
      setSubmitError({
        message: "We couldn't reach the website. Check your internet connection, then tap Post it to try again. Your post is saved on this device.",
      });
      setPhase("editing");
    } finally {
      postingRef.current = false;
    }
  }

  useEffect(() => {
    if (!waitingToPost || phase !== "editing") return;
    if (mediaFailed) {
      setWaitingToPost(false);
      setSubmitError({ message: "Your photo or video didn't finish uploading. Tap “Change the photo” and then Try again." });
      return;
    }
    if (!mediaUploading && !(draft.photo && !draft.photo.mediaId)) void postIt();
    // postIt reads the latest state each render; re-run only when upload state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingToPost, mediaUploading, mediaFailed, draft.photo, phase]);

  async function tryAgain() {
    if (!outcome || retrying) return;
    setRetrying(true);
    try {
      const result = await retryPost(outcome.postId);
      if (result.ok) setOutcome(result);
    } catch {
      /* the rows keep showing the last known state; the button stays available */
    }
    setRetrying(false);
  }

  async function startOver() {
    await draftStore.remove(DRAFT_KEY);
    setDraft(freshDraft(platforms));
    setOutcome(null);
    setSubmitError(null);
    setPhotoState("idle");
    setPhotoError(null);
    setVideoState("idle");
    setVideoError(null);
    videoFile.current = null;
    setPhase("editing");
    window.scrollTo({ top: 0 });
  }

  // ===================== Screens =====================

  if (phase === "loading") return <p>One moment…</p>;

  if (phase === "resume") {
    return (
      <>
        <h1>You started a post earlier</h1>
        <p className="m-intro">It was saved on this device. Would you like to finish it?</p>
        {draft.message.trim() && <blockquote className="m-quote">{draft.message}</blockquote>}
        <div className="m-stack">
          <button className="m-btn m-btn--primary m-btn--block" onClick={() => setPhase("editing")}>
            Keep going
          </button>
          <button className="m-btn m-btn--block" onClick={startOver}>
            Throw it away and start over
          </button>
        </div>
      </>
    );
  }

  if (phase === "posting") {
    return (
      <div className="m-center" role="status">
        <div className="m-spinner" aria-hidden="true" />
        <h1>Posting…</h1>
        <p className="m-intro">This can take up to a minute. Please keep this screen open.</p>
      </div>
    );
  }

  if (phase === "done" && outcome) {
    const needsAction = outcome.destinations.some((d) => d.state === "failed" || d.state === "unknown" || d.state === "waiting");
    const allGood = outcome.destinations.every((d) => d.state === "posted");
    return (
      <>
        <h1>{allGood ? "Your post is up! 🎉" : "Your post is on the website"}</h1>
        <ul className="m-dests">
          {outcome.destinations.map((d) => (
            <DestinationRow key={d.key} d={d} postPath={outcome.postPath} helpName={helpName} />
          ))}
        </ul>
        {needsAction && (
          <button className="m-btn m-btn--primary m-btn--block" onClick={tryAgain} disabled={retrying}>
            {retrying ? "Checking…" : "Try again"}
          </button>
        )}
        <div className="m-stack" style={{ marginTop: 16 }}>
          <button className="m-btn m-btn--block" onClick={startOver}>
            Make another post
          </button>
          <Link href="/manage" className="m-btn m-btn--block">
            Back to home
          </Link>
        </div>
      </>
    );
  }

  const stepNumber = STEPS.indexOf(draft.step) + 1;
  const back = draft.step === "photo" ? null : STEPS[stepNumber - 2];

  return (
    <>
      <p className="m-step-count">Step {stepNumber} of 4</p>

      {draft.step === "photo" && (
        <>
          <h1>Add a photo or video</h1>
          <p className="m-intro">Posts with a photo or video get noticed more. You can also skip this.</p>
          {(photoError || videoError) && (
            <div className="m-notice m-notice--error" role="alert">
              {photoError || videoError}
            </div>
          )}
          {videoState === "uploading" ? (
            <div className="m-center" role="status">
              <div className="m-progress" aria-hidden="true">
                <div style={{ width: `${videoProgress}%` }} />
              </div>
              <p>
                <strong>Uploading your video… {videoProgress}%</strong>
              </p>
              <p className="m-hint">Please keep this screen open. Longer videos take a minute or two.</p>
            </div>
          ) : videoState === "failed" && videoFile.current ? (
            <div className="m-stack">
              <button className="m-btn m-btn--primary m-btn--block" onClick={() => videoFile.current && sendVideo(videoFile.current)}>
                Try again
              </button>
              <button className="m-btn m-btn--block" onClick={removeMedia}>
                Choose something else
              </button>
            </div>
          ) : draft.video ? (
            <>
              {videoPosterUrl(draft.video.publicId) && (
                <img src={videoPosterUrl(draft.video.publicId)!} alt="Your video" className="m-photo-preview" />
              )}
              <p className="m-hint">✓ Your video is uploaded.</p>
              <h2>Add music?</h2>
              <p className="m-intro" style={{ marginBottom: 12 }}>
                We&apos;ll pick a song that fits. The first line of your message will also show on the video.
              </p>
              <ul className="m-choices">
                {[
                  { value: true, label: "🎵 Yes, add music", sub: "The music replaces the video's own sound" },
                  { value: false, label: "No music", sub: "Keep the video's own sound" },
                ].map((o) => {
                  const on = draft.withMusic === o.value;
                  return (
                    <li key={String(o.value)}>
                      <button
                        type="button"
                        className={`m-choice ${on ? "m-choice--on" : ""}`}
                        aria-pressed={on}
                        onClick={() => update({ withMusic: o.value })}
                      >
                        <span className="m-choice-mark" aria-hidden="true">
                          {on ? "✓" : ""}
                        </span>
                        <span>
                          <span className="m-choice-label">{o.label}</span>
                          <span className="m-choice-state">{o.sub}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="m-stack" style={{ marginTop: 16 }}>
                <button className="m-btn m-btn--block" onClick={() => videoInput.current?.click()}>
                  Use a different video
                </button>
                <button className="m-btn m-btn--block" onClick={removeMedia}>
                  Remove video
                </button>
              </div>
            </>
          ) : draft.photo && previewUrl ? (
            <>
              <img src={previewUrl} alt="The photo for your post" className="m-photo-preview" />
              {photoState === "uploading" && <p className="m-intro">Saving your photo…</p>}
              {photoState === "upload-failed" && (
                <button className="m-btn m-btn--primary m-btn--block" onClick={() => draft.photo && upload(draft.photo.blob)}>
                  Try again
                </button>
              )}
              <div className="m-stack" style={{ marginTop: 12 }}>
                <button className="m-btn m-btn--block" onClick={() => chooseInput.current?.click()} disabled={photoBusy}>
                  Use a different photo
                </button>
                <button
                  className="m-btn m-btn--block"
                  onClick={() => {
                    update({ photo: null });
                    setPhotoState("idle");
                    setPhotoError(null);
                  }}
                  disabled={photoBusy}
                >
                  Remove photo
                </button>
              </div>
            </>
          ) : photoState === "preparing" ? (
            <p className="m-intro">Getting your photo ready…</p>
          ) : (
            <div className="m-stack">
              <button className="m-btn m-btn--block m-btn--tall" onClick={() => takeInput.current?.click()}>
                📷 Take a photo
              </button>
              <button className="m-btn m-btn--block m-btn--tall" onClick={() => chooseInput.current?.click()}>
                🖼️ Choose a photo
              </button>
              <button className="m-btn m-btn--block m-btn--tall" onClick={() => videoInput.current?.click()} disabled={!CLOUD_NAME}>
                🎬 Add a video
              </button>
            </div>
          )}
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              onVideoPicked(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={takeInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void onPhotoPicked(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={chooseInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPhotoPicked(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}

      {draft.step === "message" && (
        <>
          <h1>What do you want to say?</h1>
          <p className="m-intro">Write it the way you&apos;d say it to a customer.</p>
          <label className="m-field">
            <span className="m-label">Your message</span>
            <textarea
              className="m-input m-textarea"
              rows={7}
              value={draft.message}
              onChange={(e) => update({ message: e.target.value })}
              placeholder="Example: Fresh pork bao buns are back this weekend! Come see us Saturday 11–3."
            />
          </label>
          <p className="m-hint">Tip: tap the 🎤 microphone on your keyboard to talk instead of type.</p>
        </>
      )}

      {draft.step === "where" && (
        <>
          <h1>Where should it go?</h1>
          <p className="m-intro">Tap a box to turn it on or off.</p>
          <ul className="m-choices">
            <li>
              <div className="m-choice m-choice--on m-choice--fixed">
                <span className="m-choice-mark" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <span className="m-choice-label">Website</span>
                  <span className="m-choice-state">Always — every post goes on your News page</span>
                </span>
              </div>
            </li>
            {platforms.map((p) => {
              const on = draft.platforms.includes(p.platform);
              return (
                <li key={p.platform}>
                  <button
                    type="button"
                    className={`m-choice ${on ? "m-choice--on" : "m-choice--off"}`}
                    aria-pressed={on}
                    onClick={() =>
                      update({
                        platforms: on ? draft.platforms.filter((x) => x !== p.platform) : [...draft.platforms, p.platform],
                      })
                    }
                  >
                    <span className="m-choice-mark" aria-hidden="true">
                      {on ? "✓" : ""}
                    </span>
                    <span>
                      <span className="m-choice-label">{p.label}</span>
                      <span className="m-choice-state">{on ? "Will post" : "Won't post"}</span>
                      {p.isTest && <span className="m-choice-test">Test mode — nothing really gets posted</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {draft.step === "check" && (
        <>
          <h1>Check your post</h1>
          <p className="m-intro">This is how it will look.</p>
          <div className="m-preview-card">
            {videoPreview ? (
              <>
                <video
                  className="m-preview-video"
                  src={videoPreview.src}
                  poster={videoPreview.poster}
                  controls
                  playsInline
                  preload="none"
                />
                <p className="m-hint" style={{ padding: "8px 16px 0", margin: 0 }}>
                  Tap ▶ to watch{draft.withMusic ? " with the music" : ""}. The first time can take up to a minute to get ready.
                </p>
              </>
            ) : (
              previewUrl && <img src={previewUrl} alt="" />
            )}
            <p className="m-preview-text">{draft.message.trim() || <em>(No message yet)</em>}</p>
            <p className="m-preview-link">eastmeetswestfoods.co</p>
          </div>
          <p>
            <strong>Going to:</strong> Website
            {chosen.map((p) => `, ${p.label}${p.isTest ? " (test mode)" : ""}`).join("")}
          </p>
          <div className="m-stack" style={{ marginBottom: 20 }}>
            <button className="m-btn m-btn--small" onClick={() => goTo("photo")}>
              {draft.video ? "Change the video" : "Change the photo"}
            </button>
            <button className="m-btn m-btn--small" onClick={() => goTo("message")}>
              Change the words
            </button>
            <button className="m-btn m-btn--small" onClick={() => goTo("where")}>
              Change where it goes
            </button>
          </div>
          {problems.length > 0 && (
            <div className="m-notice m-notice--warn" role="alert">
              <strong>Before you post:</strong>
              <ul style={{ margin: "8px 0 0" }}>
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {submitError && (
            <div className="m-notice m-notice--error" role="alert">
              {submitError.message}{" "}
              {submitError.signedOut && (
                <a className="m-link" href="/manage/login" target="_blank" rel="noopener">
                  Sign in
                </a>
              )}
            </div>
          )}
          <button
            className="m-btn m-btn--primary m-btn--block m-btn--tall"
            onClick={postIt}
            disabled={problems.length > 0 || waitingToPost}
          >
            {waitingToPost ? "Waiting for your photo to finish saving…" : "Post it"}
          </button>
          {waitingToPost && (
            <p className="m-hint" role="status" style={{ textAlign: "center" }}>
              It will post by itself as soon as the photo is ready. Please keep this screen open.
            </p>
          )}
        </>
      )}

      <div className="m-nav-row">
        {back ? (
          <button className="m-btn" onClick={() => goTo(back)}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        {draft.step !== "check" && (
          <button
            className="m-btn m-btn--primary"
            onClick={() => goTo(STEPS[stepNumber])}
            disabled={draft.step === "photo" && (photoBusy || Boolean(draft.photo && !draft.photo.mediaId))}
          >
            {draft.step === "photo" && !draft.photo && !draft.video ? "Skip — no photo →" : "Next →"}
          </button>
        )}
      </div>

      {draft.step !== "photo" || draft.photo || draft.video || draft.message ? (
        <p style={{ marginTop: 32 }}>
          <button className="m-linkbtn" onClick={startOver}>
            Throw this post away
          </button>
        </p>
      ) : null}
    </>
  );
}

function DestinationRow({ d, postPath, helpName }: { d: Destination; postPath: string; helpName: string }) {
  const test = d.isTest ? " (test mode — nothing really posted)" : "";
  if (d.state === "posted") {
    const href = d.key === "website" ? postPath : d.url;
    return (
      <li className="m-dest m-dest--good">
        <span className="m-dest-mark">✓</span>
        <span>
          <strong>{d.key === "website" ? "On your website" : `Posted to ${d.label}`}</strong>
          {test}
          {href && !d.isTest && (
            <>
              {" "}
              <a className="m-link" href={href} target="_blank" rel="noopener noreferrer">
                See it
              </a>
            </>
          )}
        </span>
      </li>
    );
  }
  if (d.state === "unknown") {
    return (
      <li className="m-dest m-dest--warn">
        <span className="m-dest-mark">?</span>
        <span>
          <strong>Not sure yet whether {d.label} got it.</strong>
          {test} Tap <em>Try again</em> below — it checks first, and won&apos;t post it twice.
        </span>
      </li>
    );
  }
  if (d.state === "failed" || d.state === "waiting") {
    return (
      <li className="m-dest m-dest--bad">
        <span className="m-dest-mark">✗</span>
        <span>
          <strong>{d.label} didn&apos;t go through.</strong>
          {test} Your post is safe. Tap <em>Try again</em> below.
        </span>
      </li>
    );
  }
  return (
    <li className="m-dest m-dest--bad">
      <span className="m-dest-mark">✗</span>
      <span>
        <strong>{d.label} isn&apos;t accepting posts right now.</strong>
        {test} Your post is safe on the website. Please let {helpName} know.
      </span>
    </li>
  );
}
