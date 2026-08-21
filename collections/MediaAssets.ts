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
    // Without this, Payload falls back to showing each item's raw stored
    // filename everywhere (this list, the "choose existing" picker,
    // breadcrumbs) instead of a name the owner actually chose. The "Title"
    // field below defaults to the filename on upload but stays freely
    // editable afterward — this makes that the display name instead,
    // without touching the actual stored filename/URL.
    useAsTitle: "alt",
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    // No mimeTypes (see above), and deliberately no addRandomSuffix on the
    // plugin config either (see payload.config.ts) — filenames stay
    // exactly as uploaded, same as Media. A genuine name collision gets
    // rejected outright by Vercel Blob rather than silently overwritten or
    // silently renamed; the owner sees an upload error and has to rename
    // the file before retrying. Considered and rejected: real "(1)"/"(2)"-
    // style auto-rename on collision, like a phone or Finder/Explorer does
    // — Vercel's client-upload token API has no way to reassign the
    // target filename server-side (only the browser, before the upload
    // starts, can), so that would mean replacing Payload's whole supported
    // client-upload path with custom code. Not worth that risk for how
    // rarely two files would genuinely share an exact name.
    staticDir: "public/media-assets",
  },
  hooks: {
    beforeChange: [
      // Default (not force) the Title from the filename on first upload
      // only — `data.filename` is already set by this point in the create
      // operation (generateFileData runs before beforeChange). Never
      // touches an existing Title on update, so this can't clobber
      // something the owner already typed.
      ({ data, operation }) => {
        if (operation === "create" && !data?.alt && data?.filename) {
          data.alt = data.filename;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      // Still named "alt" internally (no schema change — a rename here
      // is a column rename, which risks Drizzle's interactive rename
      // prompt; see this repo's own gotchas on that). Only the label/
      // description changed, purely a display concern.
      label: "Title",
      admin: {
        description:
          "A short name for this video or file — shown here in the list, and in the picker wherever it's " +
          "used elsewhere. Starts out matching the uploaded file's name; feel free to change it to whatever's " +
          "easiest to recognize. Not shown on the public site.",
      },
    },
  ],
};
