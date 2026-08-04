import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { MenuItems } from "./collections/MenuItems";
import { News } from "./collections/News";
import { Testimonials } from "./collections/Testimonials";
import { Navigation } from "./globals/Navigation";
import { Home } from "./globals/Home";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      beforeDashboard: ["@/components/admin/GettingStarted#GettingStarted"],
    },
  },
  collections: [Users, Media, MenuItems, News, Testimonials],
  globals: [Navigation, Home],
  editor: lexicalEditor(),
  // Only kicks in once a Blob store is connected on Vercel and injects this
  // token — local dev keeps writing to public/media on disk, untouched.
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
  }),
});
