import type { CollectionConfig } from "payload";

// Local disk storage for dev. Vercel's filesystem is ephemeral/read-only in
// production, so this will need a cloud storage adapter (e.g. Vercel Blob)
// before deploying — a separate step, not needed for local work yet.
export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    staticDir: "public/media",
  },
  fields: [{ name: "alt", type: "text" }],
};
