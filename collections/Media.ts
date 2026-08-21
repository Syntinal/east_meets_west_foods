import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// staticDir is only actually used locally — the Vercel Blob storage plugin
// (payload.config.ts) takes over uploads entirely once BLOB_READ_WRITE_TOKEN
// is set, since Vercel's filesystem is ephemeral/read-only in production.
//
// Images only — video and PDF moved out to collections/MediaAssets.ts,
// specifically so those can use Vercel Blob's `clientUploads: true`
// (uploads go straight from the browser to Blob storage, bypassing
// Vercel's ~4.5MB serverless-function body limit) without disturbing this
// collection's own `clientUploads: false`, which stays off specifically to
// avoid the focal-point crop-data 404 bug described on the plugin config in
// payload.config.ts. There was no real video/PDF data in this collection
// at the time of the split (confirmed via the API before making the
// change), so nothing needed migrating.
//
// Individual upload fields elsewhere that render their value as an <img>
// (Home's hero/gallery, Menu Items' photo, page blocks, etc.) add
// `filterOptions: { mimeType: { contains: "image" } }` so the "choose from
// existing" picker only offers images there — belt-and-suspenders now that
// this collection is image-only at the collection level too, but still
// worth keeping since a future field here could theoretically loosen that.
export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: "Photo",
    plural: "Photos",
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
    mimeTypes: ["image/*"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: { description: "Alt text for the image (not shown on the page)." },
    },
  ],
};
