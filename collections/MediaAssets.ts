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
//
// Deliberately NOT setting `upload.mimeTypes` here, unlike Media — this is
// a real tradeoff, not an oversight. Confirmed against Payload's own
// source (node_modules/payload/dist/uploads/checkFileRestrictions.js) and
// GitHub issues #16485/#14709: whenever a collection sets `mimeTypes`,
// Payload runs a "secondary" validation step that re-sniffs the real file
// bytes and, if that sniff comes back empty (a confirmed, still-open bug
// for client-uploaded files — the extension→mimetype fallback map only
// covers a handful of *text* formats and defaults everything else,
// including PDFs and video like `.mov`, to `text/plain`), rejects the
// upload outright. Hit this for real: a genuine .mov upload here failed
// with "File type text/plain (from extension MOV) is not allowed," even
// though the file itself was fine — confirmed by the raw bytes landing
// correctly in Vercel Blob (visible in Manage Blobs) despite Payload
// refusing to create the document for it. That secondary check only runs
// when `mimeTypes` is set (`configMimeTypes.length > 0`); leaving it unset
// skips that whole broken path. Payload's baseline dangerous-file-type
// block (.exe/.dll/.bat/etc., unconditional regardless of `mimeTypes`)
// still applies, so this isn't wide open — just no longer scoped
// specifically to video/PDF at the collection level. The consuming
// fields' own `filterOptions` still narrow the "choose existing" picker
// to the right type; a trusted single owner uploading the wrong file type
// directly into this collection by mistake is the same class of accepted,
// low-likelihood gap collections/Media.ts's own comment already notes for
// its filterOptions-only fields. Revisit once Payload ships a real fix.
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
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: { description: "A short description of the video or file (not shown on the page)." },
    },
  ],
};
