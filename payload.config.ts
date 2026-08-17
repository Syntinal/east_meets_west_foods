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
import { MenuIntro } from "./globals/MenuIntro";
import { Sauce } from "./globals/Sauce";
import { Story } from "./globals/Story";
import { Faq } from "./globals/Faq";
import { Contact } from "./globals/Contact";
import { UploadPostUsage } from "./globals/UploadPostUsage";

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
  globals: [Navigation, Home, MenuIntro, Sauce, Story, Faq, Contact, UploadPostUsage],
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
      // false, not true: with clientUploads on, the browser uploads the file
      // straight to Blob, then submits a bytes-free "create this doc" request.
      // Because Media has focal point enabled (the default), Payload treats
      // every new upload as needing a re-fetch of the original file to compute
      // crop data — and does that by calling its own /api/media/file/:filename
      // endpoint, which only resolves via an *existing* DB row. On a brand-new
      // upload that row doesn't exist yet (this request is what creates it),
      // so the self-fetch 404s and the whole create fails with a generic
      // "There was a problem while uploading the file." Confirmed via Vercel's
      // function logs (the 404'd self-fetch shows up under "External APIs")
      // while chasing down why every /admin upload was failing in production
      // despite working fine in local dev — local dev never hits this branch
      // because non-client uploads send the file bytes directly, so Payload
      // never needs to re-fetch anything. Our images are all well under
      // Vercel's request-body limit, so buffered (non-client) uploads are a
      // safe way to route around this rather than disabling focal point.
      clientUploads: false,
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
