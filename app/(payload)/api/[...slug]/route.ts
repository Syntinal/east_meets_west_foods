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

// News' afterChange hook (collections/News.ts) can call out to Post for Me
// (lib/socialPost.ts) inline/awaited when publishing a flagged post, once
// per platform checked (Facebook/Instagram/TikTok, run concurrently via
// Promise.all — see the hook's comment). Post for Me's own create call is
// asynchronous (see lib/socialPost.ts's header comment), so each platform
// call covers a ~9s bounded poll on top of the API call itself; running
// them concurrently keeps the worst case near that same ~9s rather than
// ~27s for all 3 in series — a thinner safety margin than when this
// comment was written for Buffer's single near-instant round trip, but
// still comfortably inside 60s for the realistic worst case. Applies to
// all Payload admin operations through this route, not just that one hook.
export const maxDuration = 60;

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
