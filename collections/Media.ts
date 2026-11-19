import type { CollectionConfig } from "payload";
import { APIError } from "payload";
import { authenticated } from "@/access/authenticated";
import { logActivity } from "@/lib/activityLog";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 8000;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];

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
  hooks: {
    // Server-side backstop for uploads from both /manage (which already
    // shrinks photos on the device, see lib/manage/compressImage.ts) and
    // /admin. Vercel rejects request bodies over ~4.5MB before they get
    // here at all; this catches what's left with a readable message, plus
    // absurd dimensions that would make every page using the photo slow.
    beforeOperation: [
      ({ operation, req }) => {
        if (operation !== "create" && operation !== "update") return;
        const file = req.file;
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
          // Written on its own (no req) so it survives the rejected upload.
          void logActivity(req.payload, { summary: "A photo upload was turned down: too large", status: "failed", area: "photo", who: (req.user as { email?: string } | null)?.email });
          throw new APIError("This photo is too large. Please choose a smaller one.", 400, undefined, true);
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          void logActivity(req.payload, { summary: "A photo upload was turned down: not a supported kind of file", status: "failed", area: "photo", who: (req.user as { email?: string } | null)?.email });
          throw new APIError("This kind of file isn't supported. Please use a regular photo (JPEG or PNG).", 400, undefined, true);
        }
      },
    ],
    afterChange: [
      async ({ operation, req }) => {
        if (operation === "create") await logActivity(req.payload, { summary: "Photo uploaded", area: "photo" }, req);
      },
    ],
    beforeChange: [
      ({ data }) => {
        if ((data?.width ?? 0) > MAX_DIMENSION || (data?.height ?? 0) > MAX_DIMENSION) {
          throw new APIError("This photo is too large. Please choose a smaller one.", 400, undefined, true);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: { description: "Alt text for the image (not shown on the page)." },
    },
  ],
};
