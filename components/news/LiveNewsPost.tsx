"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import {
  buildOverlayVideoUrl,
  type AudioMode,
  type CaptionStyle,
  type CaptionPosition,
  type CaptionFont,
} from "@/lib/cloudinaryVideo";
import { resolveFeaturedImageUrl } from "@/lib/cloudinaryImage";
import { buildClosingCardText } from "@/lib/closingCardText";
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
                additionalTextCards: [cv?.confirmedTextCard2, cv?.confirmedTextCard3],
                closingCardText: cv?.confirmedAddClosingCard ? buildClosingCardText() : null,
                durationSeconds: cv?.confirmedDurationSeconds,
                musicPublicId: MUSIC_LIBRARY.find((track) => track.id === cv?.confirmedMusicTrackId)?.publicId ?? null,
                audioMode: (cv?.confirmedAudioMode as AudioMode) || "replace",
                captionStyle: (cv?.confirmedCaptionStyle as CaptionStyle) || "white-on-black",
                captionPosition: (cv?.confirmedCaptionPosition as CaptionPosition) || "bottom",
                captionFont: (cv?.confirmedCaptionFont as CaptionFont) || "arial",
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
            (cv?.textCard2 ?? "") !== (cv?.confirmedTextCard2 ?? "") ||
            (cv?.textCard3 ?? "") !== (cv?.confirmedTextCard3 ?? "") ||
            Boolean(cv?.addClosingCard) !== Boolean(cv?.confirmedAddClosingCard) ||
            (cv?.musicTrackId || "none") !== (cv?.confirmedMusicTrackId || "none") ||
            (cv?.audioMode || "replace") !== (cv?.confirmedAudioMode || "replace") ||
            (cv?.captionStyle || "white-on-black") !== (cv?.confirmedCaptionStyle || "white-on-black") ||
            (cv?.captionPosition || "bottom") !== (cv?.confirmedCaptionPosition || "bottom") ||
            (cv?.captionFont || "arial") !== (cv?.confirmedCaptionFont || "arial")),
      }
    : undefined;

  // Same gating idea as videoPreviewOverride above, for the photo caption —
  // see collections/News.ts's photoCaption.confirmedX fields and
  // components/admin/PhotoCaptionStudio.tsx. Unlike video, there's always a
  // sensible fallback while nothing's confirmed yet for the current photo:
  // the plain, uncaptioned photo itself, not a placeholder message — a photo
  // is meaningful content on its own in a way a not-yet-composited video
  // isn't.
  const image = data.featuredImage && typeof data.featuredImage === "object" ? data.featuredImage : null;
  const pc = data.photoCaption;
  const isConfirmedForCurrentImage =
    Boolean(pc?.confirmedImageId) && String(pc?.confirmedImageId) === String(image?.id ?? "");

  const imagePreviewOverride = image
    ? {
        // Nothing confirmed for this exact photo yet → show it plain rather
        // than nothing, same reasoning as this override's own type comment
        // in NewsPostView.tsx.
        url: isConfirmedForCurrentImage
          ? (resolveFeaturedImageUrl({
              cloudName: CLOUD_NAME,
              image,
              captionText: pc?.confirmedText,
              captionStyle: pc?.confirmedCaptionStyle,
              captionPosition: pc?.confirmedCaptionPosition,
            })?.url ?? null)
          : (image.url ?? null),
        alt: image.alt ?? null,
        // Only meaningful once something's actually been confirmed for this
        // exact photo — mirrors videoPreviewOverride's isStale exactly.
        isStale:
          isConfirmedForCurrentImage &&
          ((pc?.text ?? "") !== (pc?.confirmedText ?? "") ||
            (pc?.captionStyle || "white-on-black") !== (pc?.confirmedCaptionStyle || "white-on-black") ||
            (pc?.captionPosition || "bottom") !== (pc?.confirmedCaptionPosition || "bottom")),
      }
    : undefined;

  return (
    <NewsPostView post={data} videoPreviewOverride={videoPreviewOverride} imagePreviewOverride={imagePreviewOverride} />
  );
}
