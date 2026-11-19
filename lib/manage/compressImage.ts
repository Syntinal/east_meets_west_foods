// Shrinks a phone photo on the device before upload. Phone photos are often
// 5–12MB; Vercel rejects request bodies over ~4.5MB. Target: longest side
// ≤ 2000px and ideally under 2MB, always re-encoded as JPEG (which also
// converts HEIC/PNG/etc. into something every platform accepts). Steps
// quality down, then size down, until it fits — dimensions alone don't
// guarantee a small file.

const TARGET_BYTES = 2 * 1024 * 1024;
const HARD_MAX_BYTES = 4 * 1024 * 1024; // matches collections/Media.ts's server check
const SIZES = [2000, 1600, 1280];
const QUALITIES = [0.85, 0.75, 0.65];

export class PhotoUnreadableError extends Error {}
export class PhotoTooLargeError extends Error {}

type Drawable = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

async function decode(file: Blob): Promise<Drawable> {
  // createImageBitmap honors the EXIF rotation, so sideways phone photos
  // come out upright.
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close() };
  } catch {
    // Older Safari: fall back to an <img>, which also applies EXIF rotation.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new PhotoUnreadableError("unreadable");
    }
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressPhoto(file: Blob): Promise<Blob> {
  const img = await decode(file);
  try {
    let smallest: Blob | null = null;
    for (const max of SIZES) {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PhotoUnreadableError("no canvas");
      ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      for (const q of QUALITIES) {
        const blob = await toJpeg(canvas, q);
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= TARGET_BYTES) return blob;
      }
    }
    if (smallest && smallest.size <= HARD_MAX_BYTES) return smallest;
    throw new PhotoTooLargeError("too large");
  } finally {
    img.cleanup();
  }
}

/** Uploads to Payload's own photo library endpoint (same as /admin uses), signed in via the session cookie. */
export async function uploadPhoto(blob: Blob): Promise<{ id: number | string; url: string }> {
  const form = new FormData();
  form.append("file", blob, `post-photo-${Date.now()}.jpg`);
  form.append("_payload", JSON.stringify({ alt: "" }));
  const res = await fetch("/api/media", { method: "POST", body: form, credentials: "include" });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  const body = await res.json();
  if (!body?.doc?.id) throw new Error("upload failed: no id");
  return { id: body.doc.id, url: body.doc.url };
}
