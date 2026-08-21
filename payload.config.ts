import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { MediaAssets } from "./collections/MediaAssets";
import { MenuItems } from "./collections/MenuItems";
import { News } from "./collections/News";
import { Testimonials } from "./collections/Testimonials";
import { Pages } from "./collections/Pages";
import { Navigation } from "./globals/Navigation";
import { Home } from "./globals/Home";
import { MenuIntro } from "./globals/MenuIntro";
import { NewsIntro } from "./globals/NewsIntro";
import { TestimonialsIntro } from "./globals/TestimonialsIntro";
import { Sauce } from "./globals/Sauce";
import { Story } from "./globals/Story";
import { Faq } from "./globals/Faq";
import { Contact } from "./globals/Contact";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    // The admin defaults to following the OS/browser's dark-mode
    // preference (or a per-user toggle) when this isn't set — which is
    // exactly why app/(payload)/admin.css's site-color overrides looked
    // like they did nothing: those mostly recolor the *light* palette,
    // and the admin was rendering in *dark* mode, where the change was
    // barely visible (dark near-black to dark near-black). The live site
    // itself has only one look — no dark mode exists to match — so there's
    // no reason for the admin to offer one either. Locking to light is
    // also one less setting for a non-technical owner to stumble into.
    theme: "light",
    components: {
      beforeDashboard: ["@/components/admin/GettingStarted#GettingStarted"],
      // A flat, site-page-ordered quick list rendered above Payload's own
      // Collections/Globals nav — see components/admin/SitePagesNav.tsx for
      // why that couldn't be done with `admin.group` alone.
      beforeNavLinks: ["@/components/admin/SitePagesNav#SitePagesNav"],
    },
  },
  collections: [Users, Media, MediaAssets, MenuItems, News, Testimonials, Pages],
  globals: [Navigation, Home, MenuIntro, NewsIntro, TestimonialsIntro, Sauce, Story, Faq, Contact],
  editor: lexicalEditor(),
  // Only kicks in once a Blob store is connected on Vercel and injects this
  // token — local dev keeps writing to public/media(-assets) on disk,
  // untouched. Two separate vercelBlobStorage() plugin instances, one per
  // collection, because `clientUploads` is a plugin-wide setting (not
  // configurable per collection within a single instance — confirmed via
  // @payloadcms/storage-vercel-blob's own types: `collections` entries only
  // carry `prefix`/`disableLocalStorage`/etc., not `clientUploads`), and
  // Media and MediaAssets deliberately need opposite values — see each.
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
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { "media-assets": true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // true, not false: MediaAssets holds video/PDF, which never triggers
      // the focal-point crop-data re-fetch above (that path only runs for
      // images — see collections/MediaAssets.ts's own comment) — so there's
      // no reason to eat Media's buffered-upload workaround here, and every
      // reason not to: buffered uploads are capped at Vercel's ~4.5MB
      // serverless-function body limit, which even a short phone video clip
      // routinely exceeds. clientUploads: true sends the bytes straight
      // from the browser to Blob storage instead, bypassing that limit
      // entirely. See collections/MediaAssets.ts for the full story.
      clientUploads: true,
      // Without this, a same-named re-upload collides with whatever's
      // already at that path in Blob storage and fails with a "blob
      // already exists" error — hit this for real immediately after a
      // failed upload left an orphaned blob (the mimeTypes bug described
      // in collections/MediaAssets.ts) and retrying under the same
      // filename then failed a second, different way. addRandomSuffix
      // makes every upload's storage path unique regardless, so retries
      // (or two files that happen to share a name) never collide. Media
      // doesn't need this — clientUploads: false there means uploads
      // never hit this failure mode the same way.
      addRandomSuffix: true,
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
