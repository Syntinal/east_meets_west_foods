"use client";

import { useEffect, useRef, useState } from "react";
import { compressPhoto, PhotoTooLargeError, PhotoUnreadableError, uploadPhoto } from "@/lib/manage/compressImage";
import { reportUploadProblem } from "@/app/(manage)/manage/activity/actions";

export type PickedPhoto = { id: number | string; url: string | null };

// "Take a photo" / "Choose a photo" with the photo shrunk on the device and
// uploaded right away (same steps as the posting screen). A failed upload
// keeps the photo on screen with a Try again button — nothing is lost.
export function PhotoPicker({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: PickedPhoto | null;
  onChange: (p: PickedPhoto | null) => void;
  /** True while a photo is being prepared/uploaded or failed to upload — callers disable Save meanwhile. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "preparing" | "uploading" | "failed">("idle");
  useEffect(() => onBusyChange?.(state !== "idle"), [state, onBusyChange]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Blob | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const take = useRef<HTMLInputElement>(null);
  const choose = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  async function upload(blob: Blob) {
    setState("uploading");
    setError(null);
    try {
      const { id, url } = await uploadPhoto(blob);
      onChange({ id, url });
      setPending(null);
      setState("idle");
    } catch {
      setState("failed");
      setError("The photo didn't upload. Check your internet connection, then tap Try again.");
      void reportUploadProblem("photo").catch(() => {});
    }
  }

  async function picked(file: File | undefined) {
    if (!file) return;
    setState("preparing");
    setError(null);
    try {
      const blob = await compressPhoto(file);
      setPending(blob);
      setLocalUrl(URL.createObjectURL(blob));
      await upload(blob);
    } catch (err) {
      setState("idle");
      setError(
        err instanceof PhotoTooLargeError
          ? "This photo is too large. Please choose a different one."
          : err instanceof PhotoUnreadableError
            ? "This photo couldn't be opened. Please choose a different one."
            : "Something went wrong with this photo. Please choose a different one.",
      );
    }
  }

  const shown = pending ? localUrl : value?.url;
  const busy = state === "preparing" || state === "uploading" || disabled;

  return (
    <div>
      {error && (
        <div className="m-notice m-notice--error" role="alert">
          {error}
        </div>
      )}
      {shown && <img src={shown} alt="" className="m-photo-preview" />}
      {state === "preparing" && <p className="m-hint">Getting your photo ready…</p>}
      {state === "uploading" && <p className="m-hint">Saving your photo…</p>}
      {state === "failed" && pending && (
        <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={() => upload(pending)}>
          Try again
        </button>
      )}
      <div className="m-stack" style={{ marginTop: 12 }}>
        <button type="button" className="m-btn m-btn--block" onClick={() => take.current?.click()} disabled={busy}>
          📷 {shown ? "Take a new photo" : "Take a photo"}
        </button>
        <button type="button" className="m-btn m-btn--block" onClick={() => choose.current?.click()} disabled={busy}>
          🖼️ {shown ? "Choose a different photo" : "Choose a photo"}
        </button>
        {shown && (
          <button
            type="button"
            className="m-btn m-btn--block"
            disabled={busy}
            onClick={() => {
              setPending(null);
              setState("idle");
              onChange(null);
            }}
          >
            Remove photo
          </button>
        )}
      </div>
      {[take, choose].map((ref, i) => (
        <input
          key={i}
          ref={ref}
          type="file"
          accept="image/*"
          capture={i === 0 ? "environment" : undefined}
          hidden
          onChange={(e) => {
            void picked(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      ))}
    </div>
  );
}
