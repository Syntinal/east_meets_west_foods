// Uploads a video straight from the phone to Cloudinary (never through our
// own server — Vercel rejects request bodies over ~4.5MB, and phone videos
// are far bigger). Signed by the existing /api/cloudinary/sign route, which
// only signs for a signed-in user. Same folder the /admin Video Studio uses.
// Uses XMLHttpRequest rather than fetch only because it reports upload
// progress, so the owner sees "Uploading… 40%" instead of a frozen screen.

export type UploadedVideo = { publicId: string; durationSeconds: number | null };

export async function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<UploadedVideo> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  if (!cloudName || !apiKey) throw new Error("not configured");

  const paramsToSign = { folder: "news-videos", timestamp: Math.floor(Date.now() / 1000) };
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paramsToSign }),
  });
  if (!signRes.ok) throw new Error(`sign failed: ${signRes.status}`);
  const { signature } = await signRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("folder", paramsToSign.folder);
  form.append("timestamp", String(paramsToSign.timestamp));
  form.append("signature", signature);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.public_id) {
          resolve({ publicId: body.public_id, durationSeconds: typeof body.duration === "number" ? body.duration : null });
        } else {
          reject(new Error(`upload failed: ${xhr.status}`));
        }
      } catch {
        reject(new Error("upload failed: bad response"));
      }
    };
    xhr.onerror = () => reject(new Error("upload failed: network"));
    xhr.send(form);
  });
}

/** A still frame from the uploaded clip, for showing it before any music/caption is added. */
export function videoPosterUrl(publicId: string): string | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return cloudName ? `https://res.cloudinary.com/${cloudName}/video/upload/so_1/${publicId}.jpg` : null;
}
