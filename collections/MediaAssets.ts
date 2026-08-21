import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// Split out of collections/Media.ts specifically so video/PDF uploads can
// use Vercel Blob's `clientUploads: true` (browser uploads straight to
// Blob storage) while Media (images) keeps `clientUploads: false` — see
// payload.config.ts's plugin setup for the full reasoning on both sides of
// that split.
//
// The problem this solves: on Vercel, any upload that gets buffered
// through the Payload API function (clientUploads: false) is capped at
// Vercel's hard ~4.5MB request-body limit — not a Payload/app limit, a
// platform one, same on every plan tier. Images comfortably fit under that.
// A short video from a phone does not: even 2-3 seconds of typical
// 1080p/4K phone footage commonly runs 3-10MB+ depending on bitrate, so
// video uploads were failing there. This collection's `clientUploads: true`
// routes video/PDF bytes directly from the browser to Blob storage instead,
// bypassing that function entirely — no practical size ceiling for a short
// clip or a PDF.
//
// Doesn't reuse Media's focal-point-crop-data workaround (the reason Media
// itself stays clientUploads: false) because it doesn't need to: per
// node_modules/payload/dist/uploads/generateFileData.js, focal
// point/image-resize only apply when `isImage(mimetype)` is true — video
// and PDF uploads skip that path entirely regardless of clientUploads, so
// the crop-data self-fetch-404 bug this collection would otherwise share
// with Media's own comment never applies here.
//
// No filterOptions coordination needed on relationTo fields elsewhere —
// each of those fields (News' featuredVideo, blocks/FileBlock.ts,
// blocks/VideoBlock.ts) already narrows further by mimeType (video vs pdf)
// on top of pointing at this collection.
export const MediaAssets: CollectionConfig = {
  slug: "media-assets",
  labels: {
    singular: "Video / File",
    plural: "Videos & Files",
  },
  admin: {
    group: "Site Settings",
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    staticDir: "public/media-assets",
    mimeTypes: ["video/*", "application/pdf"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: { description: "A short description of the video or file (not shown on the page)." },
    },
  ],
};
