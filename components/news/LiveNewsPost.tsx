"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import { buildOverlayVideoUrl, type AudioMode, type CaptionStyle, type CaptionPosition } from "@/lib/cloudinaryVideo";
import { NewsPostView, type NewsDoc } from "./NewsPostView";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// One post per page, so unlike the menu/testimonials list views this can
// hand the hook the real initial doc directly — no merge-by-id needed.
export function LiveNewsPost({ initialData }: { initialData: NewsDoc }) {
  const { data } = useLivePreview<NewsDoc>({
    initialData,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  const cv = data.cloudinaryVideo;
  // Only relevant when a Cloudinary video is actually attached — plain
  // Featured Video / photo posts have nothing here to gate; NewsPostView
  // renders those exactly as before (videoPreviewOverride omitted).
  const hasCloudinaryVideo = Boolean(cv?.publicId);
  // A "confirmed" doc has its own confirmedPublicId; it only actually
  // applies to the *current* video, though — if the owner replaced the
  // clip since the last confirm, confirmedPublicId still points at the old
  // one and must NOT be treated as confirming anything about this video.
  // Mirrors CloudinaryVideoStudio.tsx's own isConfirmedForCurrentVideo
  // exactly, just read from the synced Live Preview doc instead of local
  // form state.
  const confirmedPublicId = cv?.confirmedPublicId;
  const isConfirmedForCurrentVideo = Boolean(confirmedPublicId) && confirmedPublicId === cv?.publicId;

  const videoPreviewOverride = hasCloudinaryVideo
    ? {
        url:
          isConfirmedForCurrentVideo && CLOUD_NAME && confirmedPublicId
            ? buildOverlayVideoUrl({
                cloudName: CLOUD_NAME,
                publicId: confirmedPublicId,
                overlayText: cv?.confirmedOverlayText,
                musicPublicId: MUSIC_LIBRARY.find((track) => track.id === cv?.confirmedMusicTrackId)?.publicId ?? null,
                audioMode: (cv?.confirmedAudioMode as AudioMode) || "replace",
                captionStyle: (cv?.confirmedCaptionStyle as CaptionStyle) || "white-on-black",
                captionPosition: (cv?.confirmedCaptionPosition as CaptionPosition) || "bottom",
              })
            : null,
        // Not just "isConfirmedForCurrentVideo" — also true when nothing's
        // been confirmed for this video at all, so the "no preview yet"
        // messaging and the "changed since" messaging aren't conflated
        // (NewsPostView tells those two cases apart itself via url being
        // null vs. non-null).
        isStale:
          isConfirmedForCurrentVideo &&
          ((cv?.overlayText ?? "") !== (cv?.confirmedOverlayText ?? "") ||
            (cv?.musicTrackId || "none") !== (cv?.confirmedMusicTrackId || "none") ||
            (cv?.audioMode || "replace") !== (cv?.confirmedAudioMode || "replace") ||
            (cv?.captionStyle || "white-on-black") !== (cv?.confirmedCaptionStyle || "white-on-black") ||
            (cv?.captionPosition || "bottom") !== (cv?.confirmedCaptionPosition || "bottom")),
      }
    : undefined;

  return <NewsPostView post={data} videoPreviewOverride={videoPreviewOverride} />;
}
