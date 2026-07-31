import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// staticDir is only actually used locally — the Vercel Blob storage plugin
// (payload.config.ts) takes over uploads entirely once BLOB_READ_WRITE_TOKEN
// is set, since Vercel's filesystem is ephemeral/read-only in production.
export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    staticDir: "public/media",
  },
  fields: [{ name: "alt", type: "text" }],
};
