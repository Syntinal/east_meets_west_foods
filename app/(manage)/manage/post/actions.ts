"use server";

import { getManageSession, type ManageSession, type ManageUser } from "@/lib/manage/auth";
import { getPostablePlatforms } from "@/lib/manage/platforms";
import { findPostProblems } from "@/lib/manage/postValidation";
import { MOCK_NOTE_PREFIX } from "@/lib/socialPostMock";
import type { SocialPlatform } from "@/lib/socialPost";
import { captionFromMessage, pickTrackId } from "@/lib/manage/videoChoices";
import { logActivity } from "@/lib/activityLog";

export type PostVideo = { publicId: string; durationSeconds: number | null; withMusic: boolean };

// Server actions behind the /manage posting screen. Both go through
// Payload's normal create/update — so the existing afterChange hook in
// collections/News.ts does the real social posting (same code path as
// /admin), the site revalidates as usual, and access control applies
// (overrideAccess: false + the signed-in user on every call).

export type DestinationState = "posted" | "failed" | "unknown" | "needs_help" | "waiting";
export type Destination = { key: string; label: string; state: DestinationState; url?: string | null; isTest?: boolean };
export type PostOutcome =
  | { ok: true; postId: number | string; postPath: string; destinations: Destination[] }
  | { ok: false; message: string; signedOut?: boolean };

const STATUS_FIELD: Record<SocialPlatform, string> = {
  facebook: "facebookPostStatus",
  instagram: "instagramPostStatus",
  tiktok: "tikTokPostStatus",
};
const CHECKBOX_FIELD: Record<SocialPlatform, string> = {
  facebook: "postToFacebook",
  instagram: "postToInstagram",
  tiktok: "postToTikTok",
};
const LABEL: Record<SocialPlatform, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" };
const URL_FIELD: Record<SocialPlatform, string> = {
  facebook: "facebookPostUrl",
  instagram: "instagramPostUrl",
  tiktok: "tikTokPostUrl",
};
const ERROR_FIELD: Record<SocialPlatform, string> = {
  facebook: "facebookPostError",
  instagram: "instagramPostError",
  tiktok: "tikTokPostError",
};

type NewsDoc = { id: number | string; slug?: string; _status?: string; socialMedia?: Record<string, unknown> };

function describe(doc: NewsDoc): PostOutcome {
  const sm = doc.socialMedia ?? {};
  const destinations: Destination[] = [{ key: "website", label: "Website", state: "posted" }];
  for (const platform of Object.keys(STATUS_FIELD) as SocialPlatform[]) {
    if (!sm[CHECKBOX_FIELD[platform]]) continue;
    const status = sm[STATUS_FIELD[platform]];
    const state: DestinationState =
      status === "posted"
        ? "posted"
        : status === "failed"
          ? "failed"
          : status === "failed_permanent"
            ? "needs_help"
            : status === "unknown"
              ? "unknown"
              : "waiting";
    const error = sm[ERROR_FIELD[platform]];
    destinations.push({
      key: platform,
      label: LABEL[platform],
      state,
      url: state === "posted" ? ((sm[URL_FIELD[platform]] as string) ?? null) : null,
      isTest: typeof error === "string" && error.startsWith(MOCK_NOTE_PREFIX),
    });
  }
  return { ok: true, postId: doc.id, postPath: `/news/${doc.slug ?? ""}`, destinations };
}

async function findBySubmissionKey(payload: ManageSession["payload"], user: ManageUser, key: string) {
  const res = await payload.find({
    collection: "news-posts",
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    where: { submissionKey: { equals: key } },
  });
  return (res.docs[0] as unknown as NewsDoc | undefined) ?? null;
}

const SIGNED_OUT: PostOutcome = {
  ok: false,
  signedOut: true,
  message: "You've been signed out. Please sign in again — your post is saved on this device.",
};

export async function submitPost(input: {
  submissionKey: string;
  message: string;
  imageId: number | string | null;
  video?: PostVideo | null;
  platforms: SocialPlatform[];
}): Promise<PostOutcome> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;

  if (!/^[A-Za-z0-9-]{16,64}$/.test(input.submissionKey ?? "")) {
    return { ok: false, message: "Something went wrong preparing this post. Please start a new one." };
  }

  // Already submitted (double tap, or a retry after the reply got lost)?
  // Return what happened instead of posting a second copy.
  const existing = await findBySubmissionKey(payload, user, input.submissionKey);
  if (existing) return describe(existing);

  const offered = getPostablePlatforms();
  const chosen = offered.filter((p) => input.platforms.includes(p.platform));
  const video = input.video ?? null;
  // Only accept clips from the folder /manage and the Video Studio upload to.
  if (video && !/^news-videos\/[A-Za-z0-9_-]+$/.test(video.publicId)) {
    return { ok: false, message: "The video couldn't be found. Please add it again." };
  }
  const problems = findPostProblems({
    message: input.message ?? "",
    hasPhoto: Boolean(input.imageId) && !video,
    videoSeconds: video ? video.durationSeconds : undefined,
    platforms: chosen,
  });
  if (problems.length > 0) return { ok: false, message: problems.join(" ") };

  if (input.imageId && !video) {
    try {
      await payload.findByID({ collection: "media", id: input.imageId, overrideAccess: false, user, depth: 0 });
    } catch {
      return { ok: false, message: "The photo couldn't be found. Please add it again." };
    }
  }

  // A video post: fill in the same fields /admin's full Video Studio uses,
  // with the two choices made for the owner (caption = first line of the
  // post, music track picked automatically). The confirmed* copies are what
  // /admin's Live Preview shows (see collections/News.ts) — set to match, as
  // if "Update preview" had been clicked.
  let cloudinaryVideo: Record<string, unknown> | undefined;
  if (video) {
    const settings = {
      PublicId: video.publicId,
      OverlayText: captionFromMessage(input.message),
      MusicTrackId: video.withMusic ? pickTrackId(input.submissionKey) : "none",
      AudioMode: "replace",
      CaptionStyle: "white-on-black",
      CaptionPosition: "bottom",
      CaptionFont: "arial",
      DurationSeconds: video.durationSeconds,
      AddClosingCard: false,
    };
    cloudinaryVideo = {};
    for (const [k, v] of Object.entries(settings)) {
      cloudinaryVideo[k[0].toLowerCase() + k.slice(1)] = v;
      cloudinaryVideo[`confirmed${k}`] = v;
    }
  }

  const socialMedia: Record<string, boolean> = {};
  for (const p of chosen) socialMedia[CHECKBOX_FIELD[p.platform]] = true;

  try {
    const created = await payload.create({
      collection: "news-posts",
      overrideAccess: false,
      user,
      draft: false,
      depth: 0,
      data: {
        message: input.message.trim(),
        featuredImage: video ? null : (input.imageId ?? null),
        ...(cloudinaryVideo ? { cloudinaryVideo } : {}),
        submissionKey: input.submissionKey,
        socialMedia,
        _status: "published",
      } as never,
    });
    return describe(created as unknown as NewsDoc);
  } catch (err) {
    // The unique submissionKey refused a second copy (two taps racing).
    const raced = await findBySubmissionKey(payload, user, input.submissionKey);
    if (raced) return describe(raced);
    payload.logger.error(`[manage/post] create failed: ${err instanceof Error ? err.message : String(err)}`);
    await logActivity(payload, {
      summary: "A post couldn't be finished — it was kept on the device to try again",
      status: "failed",
      area: "post",
      who: user.email,
    });
    return {
      ok: false,
      message: "We couldn't finish posting. Your post is saved on this device — tap Post it to try again.",
    };
  }
}

/**
 * "Try again" / "Check again" on the done screen. Re-saves the post as
 * published, which makes the afterChange hook retry ONLY platforms that
 * haven't succeeded ("posted" ones are settled and skipped), and check
 * "unknown" ones by external_id before posting anything.
 */
export async function retryPost(postId: number | string): Promise<PostOutcome> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  try {
    // Re-send the LIVE content explicitly. A bare `{ _status }` update
    // merges onto the latest version — if someone left an unpublished
    // autosave on this post in /admin, that would push it live (the same
    // trap behind the Pork & Vegetable Bao Buns incident).
    const live = (await payload.findByID({
      collection: "news-posts",
      id: postId,
      overrideAccess: false,
      user,
      draft: false,
      depth: 0,
    })) as unknown as Record<string, unknown>;
    const { id: _id, createdAt: _c, updatedAt: _u, ...liveData } = live;
    const updated = await payload.update({
      collection: "news-posts",
      id: postId,
      overrideAccess: false,
      user,
      draft: false,
      depth: 0,
      data: { ...liveData, _status: "published" } as never,
    });
    return describe(updated as unknown as NewsDoc);
  } catch (err) {
    payload.logger.error(`[manage/post] retry failed: ${err instanceof Error ? err.message : String(err)}`);
    await logActivity(payload, { summary: "Trying a post again didn't work", status: "failed", area: "post", who: user.email });
    return { ok: false, message: "We couldn't try again just now. Please wait a minute and tap the button again." };
  }
}
