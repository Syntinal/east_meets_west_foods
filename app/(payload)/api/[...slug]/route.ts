import config from "@payload-config";
import "@payloadcms/next/css";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

// News' afterChange hook (collections/News.ts) can call out to Upload-Post
// (lib/facebookPost.ts) inline/awaited when publishing a flagged post —
// cheap insurance against Vercel's function timeout, even though the
// realistic worst case (image download + one API call) is nowhere near
// even the most conservative timeout figure. Applies to all Payload admin
// operations through this route, not just that one hook.
export const maxDuration = 60;

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
