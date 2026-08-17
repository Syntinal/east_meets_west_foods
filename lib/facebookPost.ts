// Publishes a News post to Facebook via Buffer's GraphQL API
// (developers.buffer.com) — Buffer wraps Meta's Graph API so this app
// never needs its own Facebook Developer App, OAuth flow, or Page access
// token refresh logic. The owner connects the Facebook Page once in
// Buffer's own dashboard and generates a personal API key (Settings →
// API); this app only needs that key + the connected Page's Buffer
// channel id (see collections/News.ts's `socialMedia` group for how this
// gets triggered).
//
// This replaces an earlier build of this file that used Upload-Post
// (upload-post.com) — dropped, per the owner's decision, in favor of
// Buffer. The public contract (`postToFacebook`, `buildCaption`,
// `FacebookPostResult`, `FacebookPostInput`) is unchanged, so
// collections/News.ts's afterChange hook needed no schema changes to
// switch vendors — same field names, same retry/eligibility logic.
//
// Endpoints/shapes verified directly against Buffer's live docs
// (Aug 2026):
//   https://developers.buffer.com/guides/authentication.html
//   https://developers.buffer.com/guides/your-first-post.html
//   https://developers.buffer.com/guides/posts-and-scheduling.html
//   https://developers.buffer.com/guides/error-handling.html
//   https://developers.buffer.com/guides/hosting-media.html
//   https://developers.buffer.com/examples/create-text-post.html
//   https://developers.buffer.com/examples/create-image-post.html
//   https://developers.buffer.com/reference.html (CreatePostInput, Post,
//   PostPublishingError, AssetInput/LinkAssetInput/ImageAssetInput types)
// Re-check those pages if this starts failing with unexpected shapes —
// Buffer's GraphQL schema can change, and this file is the only place
// that shape is assumed. Note Buffer's docs never actually state whether
// `mode: shareNow` resolves synchronously (the mutation response reflects
// Facebook's real result) or just means "queued to go out immediately" —
// see parseFacebookResult()'s comment for how that gap is handled.

const API_ENDPOINT = "https://api.buffer.com";

// Facebook's own photo limits, from Meta's Graph API reference for the
// Page photo-upload endpoint Buffer ultimately publishes through
// (https://developers.facebook.com/docs/graph-api/reference/page/photos/):
// "Files can not exceed 10MB" / supported formats ".jpeg, .bmp, .png, .gif,
// .tiff". Buffer's own docs (hosting-media.html) don't publish any size/
// format limits of their own for image assets — Meta's are the real
// constraint, since Buffer is just relaying to the Graph API underneath.
// Unlike the old Upload-Post integration, Buffer takes an image *URL*, not
// raw bytes — it fetches the file itself when the post goes out — so these
// checks are now a best-effort courtesy (see checkImage()) rather than
// mandatory infrastructure; a check we can't complete just lets Buffer's
// own fetch be the real test.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const SUPPORTED_PHOTO_TYPES = new Set(["image/jpeg", "image/bmp", "image/png", "image/gif", "image/tiff"]);
// Not a hard limit — Meta's own docs just say PNGs over this "may appear
// pixelated," so this only adds an informational note, never blocks a post.
const PNG_PIXELATION_WARNING_BYTES = 1 * 1024 * 1024;

// Facebook Page posts allow up to ~63,206 characters via the API (widely
// confirmed independently, though not published in Meta's own reference
// docs); this caps well under that as a safety margin rather than cutting
// it close to an unconfirmed exact number. In practice this should never
// trigger — the caption is built from `title` + `excerpt`, both short
// fields by design (excerpt already doubles as the page's SEO meta
// description elsewhere) — this exists purely as a backstop against
// something unexpectedly huge making it into either field.
const MAX_CAPTION_CHARS = 60_000;

const CREATE_POST_MUTATION = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
          externalLink
          error {
            message
            rawError
          }
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

export type FacebookPostResult = {
  success: boolean;
  url?: string;
  error?: string;
  /** True only for a permanent-looking auth/permission failure (401, or a top-level UNAUTHORIZED/FORBIDDEN/NOT_FOUND error) — see collections/News.ts's eligibility logic for what this changes. */
  permanent?: boolean;
  /** Informational note attached to an otherwise-successful post (e.g. "posted as text only, photo was skipped"). Never set alongside a failure. */
  note?: string;
};

export type FacebookPostInput = {
  title: string;
  excerpt?: string | null;
  /** Absolute URL — Facebook needs a real link, not a site-relative path. */
  link: string;
  featuredImage?: { url?: string | null } | null;
};

function apiKey(): string {
  return process.env.BUFFER_API_KEY || "";
}

function channelId(): string {
  return process.env.BUFFER_FACEBOOK_CHANNEL_ID || "";
}

// Exported (not just internal) so this can be verified directly against a
// deliberately oversized input without needing real Buffer credentials or
// a network call — see the temp-route verification pattern this repo uses
// elsewhere.
export function buildCaption(title: string, excerpt?: string | null): string {
  const full = excerpt ? `${title}\n\n${excerpt}` : title;
  if (full.length <= MAX_CAPTION_CHARS) return full;
  return `${full.slice(0, MAX_CAPTION_CHARS - 1)}…`;
}

async function callBuffer(input: Record<string, unknown>): Promise<Response> {
  return fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ query: CREATE_POST_MUTATION, variables: { input } }),
  });
}

async function parseFacebookResult(res: Response): Promise<FacebookPostResult> {
  if (res.status === 401) {
    return {
      success: false,
      permanent: true,
      error: "Buffer rejected our API key (401) — the BUFFER_API_KEY env var needs attention.",
    };
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    return {
      success: false,
      error: `Buffer's API rate limit was hit${retryAfter ? ` — retry after ${retryAfter}s` : ""}. This is a short rolling window (100 requests/15 min), not a monthly cap, so this should clear on its own well before the next scheduled retry.`,
    };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { success: false, error: `Buffer returned ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}` };
  }

  const body = await res.json().catch(() => null);
  if (!body) return { success: false, error: "Buffer returned a response we couldn't parse." };

  // Non-recoverable/system-level errors (bad auth, missing permission,
  // unknown channel, rate limit, server error) surface in the top-level
  // `errors` array per Buffer's error-handling guide, separate from
  // `data.createPost`'s own typed mutation error below.
  const systemError = body.errors?.[0];
  if (systemError) {
    const code = systemError.extensions?.code;
    const permanent = code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "NOT_FOUND";
    return { success: false, permanent, error: `Buffer: ${systemError.message || code || "unknown error"}` };
  }

  const createPost = body.data?.createPost;
  if (!createPost) return { success: false, error: "Buffer's response had no createPost result." };

  // A typed mutation error (e.g. validation failure, bad channel id) has a
  // `message` but no `post` — the union resolved to MutationError instead
  // of PostActionSuccess.
  if (!createPost.post) {
    return { success: false, error: createPost.message || "Buffer reported failure with no further detail." };
  }

  const post = createPost.post;
  // Facebook itself rejected the post (revoked Page connection, permission
  // issue, etc.) — Buffer surfaces this on the post it still created,
  // rather than failing the mutation outright.
  if (post.error) {
    return {
      success: false,
      error: post.error.message || post.error.rawError || "Facebook rejected the post via Buffer, with no further detail given.",
    };
  }

  if (post.externalLink) return { success: true, url: post.externalLink };

  // Buffer's docs don't state whether `mode: shareNow` / `schedulingType:
  // automatic` resolves synchronously — a success response with neither an
  // externalLink nor a post.error might just mean Buffer accepted the post
  // and hasn't confirmed final delivery back from Facebook yet. Treat as
  // posted-pending-confirmation rather than a failure (mirrors the async
  // fallback the old Upload-Post integration needed for its own queued-
  // request case) — simpler than polling, and should be rare in practice
  // given `shareNow` is meant to publish immediately.
  return {
    success: true,
    note: "Posted — Buffer accepted the post but hasn't confirmed final delivery yet (no destination link back from Facebook).",
  };
}

type ImageCheck = { ok: true; contentType?: string; contentLength?: number } | { ok: false; reason: string };

// Best-effort only — see this file's header comment for why a failed/
// inconclusive check here doesn't block the photo post outright, unlike
// the old Upload-Post design where downloading the image was mandatory
// infrastructure (Buffer takes a URL and fetches it itself).
async function checkImage(imageUrl: string): Promise<ImageCheck> {
  let res: Response;
  try {
    res = await fetch(imageUrl, { method: "HEAD" });
  } catch {
    return { ok: true };
  }
  if (!res.ok) return { ok: true };

  const contentType = res.headers.get("content-type") || undefined;
  const contentLengthHeader = res.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

  if (contentLength && contentLength > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "over Facebook's 10MB photo limit" };
  }
  if (contentType && !SUPPORTED_PHOTO_TYPES.has(contentType)) {
    return { ok: false, reason: `an unsupported format (${contentType})` };
  }
  return { ok: true, contentType, contentLength };
}

function looksLikeImageFailure(error?: string): boolean {
  if (!error) return false;
  return /image|photo|dimensions/i.test(error);
}

async function postText(input: FacebookPostInput): Promise<FacebookPostResult> {
  const res = await callBuffer({
    text: buildCaption(input.title, input.excerpt),
    channelId: channelId(),
    schedulingType: "automatic",
    mode: "shareNow",
    // A `link` asset gives Facebook a real link-preview card, same effect
    // as Upload-Post's old `facebook_link_url` field.
    assets: [{ link: { url: input.link, title: input.title, description: input.excerpt || undefined } }],
  });
  return parseFacebookResult(res);
}

async function postPhoto(input: FacebookPostInput, imageUrl: string): Promise<FacebookPostResult> {
  const check = await checkImage(imageUrl);
  if (!check.ok) {
    const fallback = await postText(input);
    return withNote(fallback, `Photo skipped — ${check.reason}; posted as text only.`);
  }

  const res = await callBuffer({
    // The image asset variant has no link/preview field of its own (each
    // Buffer asset is exactly one of image/video/document/link), so the
    // link goes in the caption itself instead of a proper preview card —
    // same tradeoff the old Upload-Post integration made.
    text: `${buildCaption(input.title, input.excerpt)}\n\nRead more: ${input.link}`,
    channelId: channelId(),
    schedulingType: "automatic",
    mode: "shareNow",
    assets: [{ image: { url: imageUrl } }],
  });
  let result = await parseFacebookResult(res);

  // Buffer fetches the image itself at publish time — if that's what
  // failed (e.g. "Failed to fetch image dimensions: Not Found"), degrade
  // gracefully to text-only instead of surfacing an opaque image error.
  if (!result.success && looksLikeImageFailure(result.error)) {
    const fallback = await postText(input);
    return withNote(fallback, "Photo skipped — Buffer couldn't process the featured image; posted as text only.");
  }

  if (check.contentType === "image/png" && check.contentLength && check.contentLength > PNG_PIXELATION_WARNING_BYTES) {
    result = withNote(result, "Note: this PNG is over 1MB — Facebook may render it pixelated. A smaller file avoids that.");
  }
  return result;
}

function withNote(result: FacebookPostResult, note: string): FacebookPostResult {
  if (!result.success) return result; // never attach a "degraded but fine" note to a real failure
  return { ...result, note: [result.note, note].filter(Boolean).join(" ") };
}

// Recognized only in mock mode (see below) — lets the hook's full range of
// outcomes (transient failure, permanent failure) be exercised via this
// repo's usual temp-route/curl verification pattern without needing real
// Buffer credentials. Has no effect once BUFFER_API_KEY is set.
const MOCK_FAIL_MARKER = "[[mock:fail]]";
const MOCK_FAIL_PERMANENT_MARKER = "[[mock:fail_permanent]]";

export async function postToFacebook(input: FacebookPostInput): Promise<FacebookPostResult> {
  if (!apiKey() || !channelId()) {
    if (input.title.includes(MOCK_FAIL_PERMANENT_MARKER)) {
      return { success: false, permanent: true, error: "Simulated permanent failure (mock mode)." };
    }
    if (input.title.includes(MOCK_FAIL_MARKER)) {
      return { success: false, error: "Simulated transient failure (mock mode)." };
    }
    return {
      success: true,
      url: "https://facebook.com/mock-post",
      note: "Simulated — BUFFER_API_KEY/BUFFER_FACEBOOK_CHANNEL_ID aren't set, so nothing was really sent to Facebook.",
    };
  }

  const imageUrl = input.featuredImage?.url;
  try {
    return imageUrl ? await postPhoto(input, imageUrl) : await postText(input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
