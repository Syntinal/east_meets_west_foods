// Publishes a News post to Facebook via Upload-Post (upload-post.com) — a
// service that wraps Meta's Graph API so this app never needs its own
// Facebook Developer App, OAuth flow, or Page access token refresh logic.
// The owner connects the Facebook Page once in Upload-Post's own
// dashboard; we only need one API key + Page ID (see collections/News.ts's
// `socialMedia` group for how this gets triggered).
//
// Endpoints/parameters verified directly against Upload-Post's live docs
// (Aug 2026):
//   https://docs.upload-post.com/api/upload-text
//   https://docs.upload-post.com/api/upload-photo
//   https://docs.upload-post.com/guides/error-handling
// Re-check those pages if this starts failing with unexpected 400s —
// Upload-Post can change field names without much notice, and this file
// is the only place that shape is assumed.

const API_BASE = "https://api.upload-post.com/api";

// Facebook's own photo limits, from Meta's Graph API reference for the
// Page photo-upload endpoint this ultimately hits
// (https://developers.facebook.com/docs/graph-api/reference/page/photos/):
// "Files can not exceed 10MB" / supported formats ".jpeg, .bmp, .png, .gif,
// .tiff". IMPORTANT: an earlier version of this file used 8MB + JPEG/PNG-
// only here — those numbers turned out to be Threads' documented limits
// from Upload-Post's own docs (https://docs.upload-post.com/api/photo-
// requirements), not Facebook's; Upload-Post's Facebook section doesn't
// give its own numbers at all, it just defers to "official Facebook
// documentation" — so Facebook's own reference is the real source here,
// not Upload-Post's. No min/max pixel dimensions are documented for this
// endpoint, so nothing is checked there. These are checked before ever
// calling Upload-Post, so a bad image degrades gracefully to a text-only
// post instead of spending an attempt on a predictable failure.
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

// Single-owner site, one connected Upload-Post profile — no need for this
// to be configurable per request.
const UPLOAD_POST_USER = "east-meets-west-foods";

export type FacebookPostResult = {
  success: boolean;
  url?: string;
  error?: string;
  /** True only for a 401 from Upload-Post itself (bad/revoked API key) — see collections/News.ts's eligibility logic for what this changes. */
  permanent?: boolean;
  /** Informational note attached to an otherwise-successful post (e.g. "posted as text only, photo was skipped"). Never set alongside a failure. */
  note?: string;
  /** Upload-Post's own monthly quota snapshot, when present on the response (both successful posts and 429s include it; 401s and network errors don't). See collections/News.ts's hook for where this gets persisted. */
  usage?: { count: number; limit: number; lastReset?: string };
};

export type FacebookPostInput = {
  title: string;
  excerpt?: string | null;
  /** Absolute URL — Facebook needs a real link, not a site-relative path. */
  link: string;
  featuredImage?: { url?: string | null } | null;
};

function apiKey(): string {
  return process.env.UPLOAD_POST_API_KEY || "";
}

function pageId(): string {
  return process.env.UPLOAD_POST_FACEBOOK_PAGE_ID || "";
}

// Exported (not just internal) so this can be verified directly against a
// deliberately oversized input without needing real Upload-Post
// credentials or a network call — see the temp-route verification pattern
// this repo uses elsewhere.
export function buildCaption(title: string, excerpt?: string | null): string {
  const full = excerpt ? `${title}\n\n${excerpt}` : title;
  if (full.length <= MAX_CAPTION_CHARS) return full;
  return `${full.slice(0, MAX_CAPTION_CHARS - 1)}…`;
}

async function parseFacebookResult(res: Response): Promise<FacebookPostResult> {
  if (res.status === 401) {
    return {
      success: false,
      permanent: true,
      error: "Upload-Post rejected our API key (401) — the UPLOAD_POST_API_KEY env var needs attention.",
    };
  }
  if (res.status === 429) {
    const body = await res.json().catch(() => null);
    const usage = extractUsage(body);
    return {
      success: false,
      error: usage
        ? `Monthly Upload-Post limit reached (${usage.count}/${usage.limit}) — resets ${usage.lastReset ?? "next cycle"}.`
        : "Monthly Upload-Post limit reached.",
      usage,
    };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { success: false, error: `Upload-Post returned ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}` };
  }

  const body = await res.json().catch(() => null);
  if (!body) return { success: false, error: "Upload-Post returned a response we couldn't parse." };
  const usage = extractUsage(body);

  // Async fallback: Upload-Post queued the request instead of answering
  // synchronously. Deliberate tradeoff (see the plan this was built
  // from): treat as posted-pending-confirmation rather than polling for
  // the real result — simpler, and correct almost always given Upload-
  // Post's typically-fast synchronous response for text/photo posts at
  // this site's low volume. Worth revisiting with real polling only if
  // this path turns out to get hit in practice.
  if (body.request_id && !body.results) {
    return {
      success: true,
      usage,
      note: "Posted — pending confirmation from Upload-Post (it queued the request instead of confirming immediately).",
    };
  }

  const fb = body.results?.facebook;
  if (fb?.success) return { success: true, url: fb.url, usage };
  return { success: false, error: fb?.error || "Upload-Post reported failure with no further detail.", usage };
}

// Upload-Post's post responses (success and 429 alike) include a
// `usage: { count, limit, last_reset }` snapshot of the account's monthly
// quota — captured here so collections/News.ts's hook can persist the
// latest known usage for the admin UI to show, since there's no separate
// "check my usage" endpoint confirmed reliable enough to poll on its own.
function extractUsage(body: unknown): FacebookPostResult["usage"] {
  const usage = (body as { usage?: { count?: unknown; limit?: unknown; last_reset?: unknown } } | null)?.usage;
  if (!usage || typeof usage.count !== "number" || typeof usage.limit !== "number") return undefined;
  return { count: usage.count, limit: usage.limit, lastReset: typeof usage.last_reset === "string" ? usage.last_reset : undefined };
}

async function postText(input: FacebookPostInput): Promise<FacebookPostResult> {
  const form = new FormData();
  form.set("user", UPLOAD_POST_USER);
  form.append("platform[]", "facebook");
  form.set("title", buildCaption(input.title, input.excerpt)); // "title" is Upload-Post's name for the actual post body text
  form.set("facebook_page_id", pageId());
  form.set("facebook_link_url", input.link); // gives Facebook a real link-preview card

  const res = await fetch(`${API_BASE}/upload_text`, {
    method: "POST",
    headers: { Authorization: `Apikey ${apiKey()}` },
    body: form,
  });
  return parseFacebookResult(res);
}

async function postPhoto(input: FacebookPostInput, imageUrl: string): Promise<FacebookPostResult> {
  let imageRes: Response;
  try {
    imageRes = await fetch(imageUrl);
  } catch {
    const fallback = await postText(input);
    return withNote(fallback, "Photo skipped — couldn't reach the featured image; posted as text only.");
  }
  if (!imageRes.ok) {
    const fallback = await postText(input);
    return withNote(fallback, "Photo skipped — featured image failed to download; posted as text only.");
  }

  const contentType = imageRes.headers.get("content-type") || "";
  const buffer = await imageRes.arrayBuffer();

  if (buffer.byteLength > MAX_PHOTO_BYTES || !SUPPORTED_PHOTO_TYPES.has(contentType)) {
    const reason =
      buffer.byteLength > MAX_PHOTO_BYTES
        ? "over Facebook's 10MB photo limit"
        : `an unsupported format (${contentType || "unknown"})`;
    const fallback = await postText(input);
    return withNote(fallback, `Photo skipped — ${reason}; posted as text only.`);
  }

  const form = new FormData();
  form.set("user", UPLOAD_POST_USER);
  form.append("platform[]", "facebook");
  // The photo endpoint has no link field, so the link goes in the caption
  // itself instead of a proper preview card.
  form.set("title", `${buildCaption(input.title, input.excerpt)}\n\nRead more: ${input.link}`);
  form.set("facebook_page_id", pageId());
  form.append("photos[]", new Blob([buffer], { type: contentType }), "featured-image");

  const res = await fetch(`${API_BASE}/upload_photos`, {
    method: "POST",
    headers: { Authorization: `Apikey ${apiKey()}` },
    body: form,
  });
  const result = await parseFacebookResult(res);

  // Not a failure — Meta's docs just say a PNG this large "may appear
  // pixelated," so this only adds a heads-up, never blocks the post.
  if (contentType === "image/png" && buffer.byteLength > PNG_PIXELATION_WARNING_BYTES) {
    return withNote(result, "Note: this PNG is over 1MB — Facebook may render it pixelated. A smaller file avoids that.");
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
// Upload-Post credentials. Has no effect once UPLOAD_POST_API_KEY is set.
const MOCK_FAIL_MARKER = "[[mock:fail]]";
const MOCK_FAIL_PERMANENT_MARKER = "[[mock:fail_permanent]]";

export async function postToFacebook(input: FacebookPostInput): Promise<FacebookPostResult> {
  if (!apiKey() || !pageId()) {
    if (input.title.includes(MOCK_FAIL_PERMANENT_MARKER)) {
      return { success: false, permanent: true, error: "Simulated permanent failure (mock mode)." };
    }
    if (input.title.includes(MOCK_FAIL_MARKER)) {
      return { success: false, error: "Simulated transient failure (mock mode)." };
    }
    return {
      success: true,
      url: "https://facebook.com/mock-post",
      note: "Simulated — UPLOAD_POST_API_KEY/UPLOAD_POST_FACEBOOK_PAGE_ID aren't set, so nothing was really sent to Facebook.",
    };
  }

  const imageUrl = input.featuredImage?.url;
  try {
    return imageUrl ? await postPhoto(input, imageUrl) : await postText(input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
