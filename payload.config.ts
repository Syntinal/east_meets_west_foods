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
import { Pages } from "./collections/Pages";
import { Navigation } from "./globals/Navigation";
import { Home } from "./globals/Home";
import { Sauce } from "./globals/Sauce";
import { Story } from "./globals/Story";
import { Faq } from "./globals/Faq";
import { Contact } from "./globals/Contact";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      beforeDashboard: ["@/components/admin/GettingStarted#GettingStarted"],
      // A flat, site-page-ordered quick list rendered above Payload's own
      // Collections/Globals nav — see components/admin/SitePagesNav.tsx for
      // why that couldn't be done with `admin.group` alone.
      beforeNavLinks: ["@/components/admin/SitePagesNav#SitePagesNav"],
    },
  },
  collections: [Users, Media, MenuItems, News, Testimonials, Pages],
  globals: [Navigation, Home, Sauce, Story, Faq, Contact],
  // Adds "Browse by Folder" + the grid/list view toggle for collections
  // that opt in via their own `folders: true` (just Media, for now — see
  // collections/Media.ts). Creates its own `payload-folders` collection
  // under the hood, so this needs a `next dev` boot to push schema. Root
  // config's type is stricter than a collection's — `{}` (all defaults),
  // not `true`, is what satisfies it.
  folders: {},
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
