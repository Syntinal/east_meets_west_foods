import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { TextStateFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
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
import { richTextState } from "./lib/richTextState";

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
  // Adds a "Text Style" color/font dropdown to every richText field's
  // toolbar on top of Payload's own recommended defaults (bold, italic,
  // links, lists, headings, etc.) — see lib/richTextState.ts for the actual
  // color/font choices and for why rendering them back out on the public
  // site needs its own converter (components/StyledRichText.tsx), since
  // TextStateFeature only wires up the admin editor's own live preview.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, TextStateFeature({ state: richTextState })],
  }),
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
      // Deliberately NOT addRandomSuffix: true here (tried it, reverted —
      // see git history) — it fixed the original "blob already exists on
      // retry" bug, but at the cost of every file getting a permanently
      // ugly stored name (e.g.
      // "IMG_0894-F2q5MNq0NZ5Lxoh61MWex5dJzykt7m.MOV"), and that original
      // bug's real cause was the mimeTypes validation bug above — already
      // fixed independently, so retries no longer collide with an orphan
      // for the reason that originally forced this on. Left at the
      // default (false, matching Media): filenames stay exactly as
      // uploaded, and on a genuine name collision, Vercel Blob's own v2
      // put() behavior rejects the upload outright rather than silently
      // overwriting (allowOverwrite isn't set either) — nothing gets
      // saved, and the owner sees an error and has to rename/retry. A
      // real "(1)"/"(2)"-style auto-rename on collision was considered
      // and explicitly not built: Vercel's client-upload token API has
      // no way to reassign the target filename server-side (confirmed
      // via @vercel/blob's own types — onBeforeGenerateToken can only
      // toggle flags, not the pathname), so real auto-dedup would mean
      // replacing Payload's entire supported client-upload wiring with
      // custom code — judged not worth that risk for how rarely two
      // files would genuinely share an exact name.
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
