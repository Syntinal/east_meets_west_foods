import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// staticDir is only actually used locally — the Vercel Blob storage plugin
// (payload.config.ts) takes over uploads entirely once BLOB_READ_WRITE_TOKEN
// is set, since Vercel's filesystem is ephemeral/read-only in production.
//
// Holds both photos and video (e.g. short clips meant for a Facebook post —
// see collections/News.ts's featuredVideo). `mimeTypes` restricts to just
// those two families rather than leaving uploads wide open to arbitrary
// files. Payload's own focal-point/crop tooling and image-resize pipeline
// both gate themselves on the file actually being an image (confirmed in
// node_modules/payload/dist/uploads/generateFileData.js's `isImage()`
// checks) — a video upload skips that whole path automatically, including
// the self-fetch-for-crop-data step the Vercel Blob `clientUploads: false`
// comment below describes, so no separate workaround is needed for video.
//
// Individual upload fields elsewhere that render their value as an <img>
// (Home's hero/gallery, Menu Items' photo, page blocks, etc.) add
// `filterOptions: { mimeType: { contains: "image" } }` so the "choose from
// existing" picker only offers images there — but that only filters what
// picking an *existing* file shows, not what a brand-new upload through
// that same field is allowed to be (mimeTypes restriction is collection-
// wide, not per-field). A non-technical single owner uploading a video into
// an image-only slot by mistake is a real gap this doesn't fully close.
export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: "Media",
    plural: "Media",
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
    staticDir: "public/media",
    mimeTypes: ["image/*", "video/*"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: { description: "Alt text for images, or a short description for videos (not shown on the page)." },
    },
  ],
};
