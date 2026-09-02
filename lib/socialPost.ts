// Publishes a News post to Facebook, Instagram, and/or TikTok via Post for
// Me (postforme.dev) — a unified social-posting API. The owner connects
// each Page/account once in Post for Me's own dashboard (a "Quickstart"
// project — Post for Me's own pre-approved app credentials, so no separate
// Facebook/TikTok Developer App or OAuth review is needed on our end);
// this app only needs one API key + each connected account's Post for Me
// account id.
//
// Originally Facebook-only (see CLAUDE.md for the vendor history — Upload-
// Post, then Buffer, then Post for Me). Generalized to 3 platforms in the
// same session Post for Me was picked, once the owner confirmed the scope.
// File renamed from facebookPost.ts to socialPost.ts to match — nothing
// here was ever committed under the old name, so no history/import churn
// beyond this branch.
//
// Endpoints/shapes verified directly against Post for Me's own OpenAPI
// spec (Aug 2026), fetched live from https://api.postforme.dev/docs —
// that page is a client-rendered Scalar viewer with no separate spec
// file exposed at a normal URL; the spec was extracted from the page's
// embedded `configuration` attribute (HTML-entity-decoded JSON) rather
// than a plain doc fetch. Re-extract the same way if this starts failing
// with unexpected shapes — curl the docs page, find the `configuration="`
// attribute, HTML-unescape it, and it's the full OpenAPI document.
// Also consulted:
//   https://www.postforme.dev/developers (auth header, base URL, Quickstart)
//   https://www.postforme.dev/resources/understanding-api-rate-limits
//   https://www.postforme.dev/resources/quickstart-vs-white-label-project
//
// **Instagram connection type**: the owner must connect Instagram using
// Post for Me's "Instagram (Facebook Login)" option, not plain
// "Instagram" — confirmed via `InstagramProviderData.connection_type`
// in the OpenAPI spec, which has exactly two values, `"facebook"` and
// `"instagram"`. `"facebook"` is the Page-linked path (default scopes
// include `pages_show_list`/`business_management`) and matches this
// business's setup (an Instagram Business account linked to its Facebook
// Page); `"instagram"` is Meta's newer Instagram-Login-only path for
// accounts with no linked Page, not applicable here. This only affects
// how the owner connects the account in Post for Me's dashboard — it
// doesn't change anything about the request shape this file sends, since
// a connected account always reports back as platform `"instagram"`
// either way.
//
// **TikTok**: standard TikTok (`tiktok`), not TikTok Business
// (`tiktok_business`) — the Business connection asks for a much larger
// permission set (audience demographics, retention graphs) this site has
// no use for; see https://www.postforme.dev/resources/tiktok-vs-tiktok-business-api.
// TikTok photo posts are real and supported here — `TiktokConfigurationDto`
// includes `auto_add_music`, documented as "automatically add music to
// photo posts," so a News post's single featured image (no video
// required) is a valid TikTok post through this API. **Not yet verified
// against a real account**: TikTok's own platform restricts unaudited
// apps (which a shared Quickstart connection is) in ways that can affect
// whether a post is actually public by default — worth a real test post
// once the account is connected, rather than assuming `privacy_status:
// "public"` below is honored exactly as asked.
//
// **Important architectural difference from the previous two vendors**:
// Post for Me's `POST /v1/social-posts` is genuinely asynchronous — it
// returns a post record with status `processing`, not the real per-
// platform result. The actual outcome (success/failure/destination URL)
// only shows up later via `GET /v1/social-post-results`. There's no
// synchronous "wait for the real result" option in the create call
// itself. To keep this feature's established "inline/awaited, no queue"
// design (see CLAUDE.md item 15) rather than standing up a webhook
// receiver or cron poller, this file does a short **bounded poll** after
// creating each post — an immediate check, then a handful of retries over
// ~9 more seconds, comfortably within both Post for Me's rate limit
// (5 req/s, 40 req/min) and Vercel's `maxDuration = 60` on the API route.
// With 3 platforms now in play, `collections/News.ts`'s hook runs all
// eligible platforms' `postToSocialPlatform()` calls concurrently
// (`Promise.all`), not sequentially — so the total wait stays ~9s worst
// case, not ~27s, and stays well inside the 60s function timeout.
// A poll that never gets *any* real response from Post for Me (network
// outage, not just "not confirmed yet") is treated as a real transient
// failure, not a success — see `pollResult()`'s `reachedApi` tracking.
// If the real result still
// isn't in by then, it's treated as posted-pending-confirmation (success,
// with a note) rather than guessed at as failed — the same posture the
// Upload-Post and Buffer versions of this file used for their own
// response-ambiguity edge cases.

const API_BASE = "https://api.postforme.dev";

export type SocialPlatform = "facebook" | "instagram" | "tiktok";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const PLATFORM_ACCOUNT_ENV_VAR: Record<SocialPlatform, string> = {
  facebook: "POSTFORME_FACEBOOK_ACCOUNT_ID",
  instagram: "POSTFORME_INSTAGRAM_ACCOUNT_ID",
  tiktok: "POSTFORME_TIKTOK_ACCOUNT_ID",
};

// A mock destination per platform, purely so mock-mode results are
// visually distinguishable across the 3 platforms in the admin (and in
// verification output) instead of all pointing at the same fake URL.
const MOCK_URL: Record<SocialPlatform, string> = {
  facebook: "https://facebook.com/mock-post",
  instagram: "https://instagram.com/mock-post",
  tiktok: "https://tiktok.com/mock-post",
};

// Real per-platform caption limits: Facebook Page posts allow up to
// ~63,206 characters via the Graph API (widely confirmed independently,
// though not published in Meta's own reference docs); Instagram's own
// caption limit (2,200 characters) *is* documented directly by Meta.
// TikTok doesn't publish an exact number for the Content Posting API's
// description field, so it reuses Instagram's confirmed limit as a
// conservative stand-in rather than a guess. All three are backstops, not
// expected code paths in practice — but unlike the old title+excerpt
// shape, `message` is now a free-form box with no length limit of its own
// (see collections/News.ts), so truncation here is a real, reachable path,
// not just a defensive backstop.
const MAX_CAPTION_CHARS: Record<SocialPlatform, number> = {
  facebook: 60_000,
  instagram: 2_200,
  tiktok: 2_200,
};

// A handful of short-interval checks rather than one long wait — Post for
// Me's create call returns before the real result is known (see header
// comment). The first check runs immediately; these are the gaps before
// each subsequent retry. Total budget ~9s worst case, well under Post for
// Me's 40 req/min rate limit and Vercel's 60s function timeout.
const POLL_GAP_MS = [1500, 2000, 2500, 3000];

export type SocialPostResult = {
  success: boolean;
  url?: string;
  error?: string;
  /** True only for a permanent-looking failure (401 bad key, 400 invalid request) — see collections/News.ts's eligibility logic for what this changes. */
  permanent?: boolean;
  /** Informational note attached to an otherwise-successful post (e.g. "posted, pending confirmation"). Never set alongside a failure. */
  note?: string;
};

export type SocialPostInput = {
  /** The whole post, as the owner wrote it in the single message box (collections/News.ts) — used as-is (truncated per-platform) as the caption. */
  message: string;
  /** Absolute URL — the platforms need a real link, not a site-relative path. */
  link: string;
  featuredImage?: { url?: string | null } | null;
  /** Takes priority over featuredImage below when both are set — each of these platforms takes one photo OR one video per post, not both. */
  featuredVideo?: { url?: string | null } | null;
};

function apiKey(): string {
  return process.env.POSTFORME_API_KEY || "";
}

function accountId(platform: SocialPlatform): string {
  return process.env[PLATFORM_ACCOUNT_ENV_VAR[platform]] || "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(platform: SocialPlatform, text: string): string {
  const max = MAX_CAPTION_CHARS[platform];
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

// Exported (not just internal) so this can be verified directly against a
// deliberately oversized input without needing real Post for Me
// credentials or a network call — see the temp-route verification pattern
// this repo uses elsewhere.
export function buildCaption(platform: SocialPlatform, message: string): string {
  return truncate(platform, message);
}

// Post for Me has no distinct "link preview" asset type the way Buffer
// did (`LinkAssetInput`) — its media array is image/video files only, so
// there's no way to get a guaranteed link-preview card through this
// vendor on any of the 3 platforms. The link just goes in the caption as
// trailing text, same as every previous vendor's photo-post fallback did;
// whether a platform auto-unfurls a bare URL in the post text into a
// preview card is up to that platform itself, not something this code
// (or Post for Me) controls.
function buildCaptionWithLink(platform: SocialPlatform, input: SocialPostInput): string {
  return truncate(platform, `${buildCaption(platform, input.message)}\n\nRead more: ${input.link}`);
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${apiKey()}` };
}

// Per-platform request configuration for POST /v1/social-posts.
// Facebook/Instagram share the `placement` enum (pinned to a normal
// timeline post, not Stories/Reels); TikTok has no `placement` concept —
// `privacy_status: "public"` is set explicitly rather than relying on
// Post for Me's own default (also "public"), so intent is clear in the
// request itself. See this file's header comment for the not-yet-
// verified caveat around TikTok's own unaudited-app restrictions.
function platformConfiguration(platform: SocialPlatform): Record<string, unknown> {
  switch (platform) {
    case "facebook":
      return { facebook: { placement: "timeline" } };
    case "instagram":
      return { instagram: { placement: "timeline" } };
    case "tiktok":
      return { tiktok: { privacy_status: "public" } };
  }
}

async function parseCreateError(platform: SocialPlatform, res: Response): Promise<SocialPostResult> {
  if (res.status === 401) {
    return {
      success: false,
      permanent: true,
      error: "Post for Me rejected our API key (401) — the POSTFORME_API_KEY env var needs attention.",
    };
  }
  if (res.status === 400) {
    // InvalidSocialPostDto — { error: string[] }. A structural problem
    // (bad account id, malformed request — e.g. Instagram/TikTok both
    // reject a caption-only post with no photo or video, unlike
    // Facebook), not something a routine retry fixes, so treated as
    // permanent like the 401 case.
    const body = await res.json().catch(() => null);
    const detail = Array.isArray(body?.error) ? body.error.join("; ") : undefined;
    return {
      success: false,
      permanent: true,
      error: detail || `Post for Me rejected the ${PLATFORM_LABEL[platform]} request as invalid (400).`,
    };
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    return {
      success: false,
      error: `Post for Me's API rate limit was hit${retryAfter ? ` — retry after ${retryAfter}s` : ""}.`,
    };
  }
  const text = await res.text().catch(() => "");
  return { success: false, error: `Post for Me returned ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}` };
}

// Polls GET /v1/social-post-results for the real per-platform outcome —
// see this file's header comment for why the create call alone doesn't
// have it yet.
async function pollResult(platform: SocialPlatform, postId: string): Promise<SocialPostResult> {
  const params = new URLSearchParams({ post_id: postId, social_account_id: accountId(platform) });
  // Tracks whether we ever got a real (2xx) response from Post for Me at
  // all, as opposed to every attempt failing at the network/HTTP level.
  // Without this, a total Post for Me outage during the poll window would
  // hit the exact same "continue" path as "not confirmed yet" on every
  // attempt, and fall through to the success-with-a-note ending below —
  // silently reporting a real outage as a probable success. Only "we
  // reached Post for Me and it just hasn't confirmed yet" should get the
  // benefit of the doubt; "we never managed to ask" should not.
  let reachedApi = false;

  for (let attempt = 0; attempt <= POLL_GAP_MS.length; attempt++) {
    if (attempt > 0) await sleep(POLL_GAP_MS[attempt - 1]); // no wait before the first, immediate check

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/v1/social-post-results?${params.toString()}`, { headers: authHeaders() });
    } catch {
      continue; // transient network hiccup mid-poll — just try again next tick
    }
    if (!res.ok) continue; // transient hiccup on Post for Me's side — keep polling
    reachedApi = true;

    const body = await res.json().catch(() => null);
    const result = body?.data?.[0];
    if (!result) continue; // Post for Me hasn't finished processing yet

    if (result.success) {
      return { success: true, url: result.platform_data?.url };
    }
    const detail =
      typeof result.error === "string"
        ? result.error
        : typeof result.error?.message === "string"
          ? result.error.message
          : JSON.stringify(result.error ?? {});
    return { success: false, error: detail || "Post for Me reported failure with no further detail." };
  }

  if (!reachedApi) {
    return {
      success: false,
      error: "Post for Me accepted the post, but we couldn't reach it afterward to confirm the result (network or Post for Me outage) — this will retry automatically.",
    };
  }

  // Reached Post for Me at least once, it just hadn't confirmed the real
  // outcome within our poll budget. Treated as success-with-a-note rather
  // than guessed at as failed; same posture this file has used for every
  // previous vendor's own response-ambiguity edge case.
  return {
    success: true,
    note: "Post for Me accepted the post but hadn't confirmed the result within our check window — worth a quick look at Post for Me's own dashboard to confirm it actually went out.",
  };
}

// Recognized only in mock mode (see below) — lets the hook's full range
// of outcomes (transient failure, permanent failure) be exercised via
// this repo's usual temp-route/curl verification pattern without needing
// real Post for Me credentials. Has no effect once a platform's real
// credentials are set. Both a platform-specific marker
// (`[[mock:fail:instagram]]`) and a platform-agnostic one
// (`[[mock:fail]]`, affecting whichever platform(s) are attempted) are
// recognized — the agnostic form is the simpler "fail everything" case;
// the platform-specific form exists so a single test post can exercise
// e.g. "Facebook succeeds, TikTok fails" now that the 3 platforms retry
// independently. Checked against the message (the owner-typed field) —
// there's no separate title field to hide these markers in anymore.
function matchesMockMarker(message: string, kind: "fail" | "fail_permanent", platform: SocialPlatform): boolean {
  return message.includes(`[[mock:${kind}:${platform}]]`) || message.includes(`[[mock:${kind}]]`);
}

export async function postToSocialPlatform(platform: SocialPlatform, input: SocialPostInput): Promise<SocialPostResult> {
  const account = accountId(platform);
  const label = PLATFORM_LABEL[platform];

  if (!apiKey() || !account) {
    if (matchesMockMarker(input.message, "fail_permanent", platform)) {
      return { success: false, permanent: true, error: `Simulated permanent failure (mock mode, ${label}).` };
    }
    if (matchesMockMarker(input.message, "fail", platform)) {
      return { success: false, error: `Simulated transient failure (mock mode, ${label}).` };
    }
    return {
      success: true,
      url: MOCK_URL[platform],
      note: `Simulated — POSTFORME_API_KEY/${PLATFORM_ACCOUNT_ENV_VAR[platform]} aren't set, so nothing was really sent to ${label}.`,
    };
  }

  try {
    const body: Record<string, unknown> = {
      caption: buildCaptionWithLink(platform, input),
      social_accounts: [account],
      platform_configurations: platformConfiguration(platform),
    };
    // No manual size/format precheck here (unlike the previous two
    // vendors) — Post for Me's own docs say it processes/resizes media
    // to fit each platform's requirements by default (`skip_processing`
    // defaults to false), so that responsibility now lives on their
    // side. A bad or unreachable image/video URL still surfaces as a real
    // failure via pollResult() above, just later than a precheck would
    // have caught it.
    //
    // Instagram and TikTok both reject a caption-only post outright (no
    // text-only post type exists on either platform) — unlike Facebook,
    // which allows one. No separate precheck for that here either: a post
    // with neither featuredImage nor featuredVideo checked for Instagram/
    // TikTok will get a real, descriptive rejection from Post for Me
    // (parseCreateError's 400 path, or a per-platform failure via
    // pollResult), which the existing failed/failed_permanent machinery
    // already surfaces to the owner — no new code path needed for it.
    //
    // Video takes priority over the image when a post has both — each of
    // these platforms takes one photo OR one video, not a mix of the two.
    // `SocialPostMediaDto` (confirmed against Post for Me's own OpenAPI
    // spec, Aug 2026) has no `type: "image" | "video"` discriminator field
    // at all — it's auto-detected from the URL/content on their end, so
    // sending a video here needs no different shape than sending a photo.
    const media = input.featuredVideo?.url
      ? { url: input.featuredVideo.url }
      : input.featuredImage?.url
        ? { url: input.featuredImage.url }
        : null;
    if (media) {
      body.media = [media];
    }

    const res = await fetch(`${API_BASE}/v1/social-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) return await parseCreateError(platform, res);

    const created = await res.json().catch(() => null);
    if (!created?.id) return { success: false, error: "Post for Me's response had no post id." };

    return await pollResult(platform, created.id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
