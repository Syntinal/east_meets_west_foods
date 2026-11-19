import type { ManageSession, ManageUser } from "./auth";
import { logActivity } from "@/lib/activityLog";
import { deriveTitleFromMessage } from "@/lib/newsText";
import { addDays, businessMidnight, businessToday } from "@/lib/businessDate";
import { captionFromMessage } from "./videoChoices";

// Earlier posts in /manage: fix the words, feature one as the home page
// banner, take one off the website and put it back. Every call passes the
// signed-in user with overrideAccess: false.
//
// Safety rules, the same ones the posting screen follows:
//  - Every save re-sends the post's LIVE content plus the change. A bare
//    partial update would merge onto the latest version — and if someone
//    left an unfinished autosave on the post in /admin, push that live (the
//    Pork & Vegetable Bao Buns trap, CLAUDE.md item 27).
//  - context.skipSocialPostHook: fixing words or the banner never posts to
//    (or retries) Facebook / Instagram / TikTok. What's already on those
//    stays as it was; that's said plainly on screen.

export type S = { payload: ManageSession["payload"]; user: ManageUser };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const SOMETHING_WRONG = "Something went wrong, and nothing was changed. Please try again.";
const COLLECTION = "news-posts" as const;

/** How long a post stays as the home page banner. null = until it's turned off; "keep" = leave the current end date. */
export type BannerChoice = { on: boolean; days: number | null | "keep" };
export const BANNER_DAY_CHOICES = [1, 3, 7] as const;

export type PostSummary = {
  id: number | string;
  title: string;
  message: string;
  date: string;
  sitePath: string;
  thumbUrl: string | null;
  hasVideo: boolean;
  banner: { on: boolean; until: string | null };
  social: string[];
};

type NewsDoc = {
  id: number | string;
  title?: string;
  slug?: string;
  message?: string;
  publishedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  featuredImage?: { url?: string | null; sizes?: { thumbnail?: { url?: string | null } } } | number | null;
  cloudinaryVideo?: { publicId?: string | null; overlayText?: string | null } | null;
  featuredVideo?: unknown;
  showAsHomepageBanner?: boolean | null;
  bannerEndDate?: string | null;
  socialMedia?: Record<string, unknown> | null;
};

const PLATFORMS = [
  { label: "Facebook", status: "facebookPostStatus" },
  { label: "Instagram", status: "instagramPostStatus" },
  { label: "TikTok", status: "tikTokPostStatus" },
];

/** The banner is "on" only while its end date hasn't passed. */
function bannerOf(d: NewsDoc): PostSummary["banner"] {
  const until = d.bannerEndDate ?? null;
  const on = Boolean(d.showAsHomepageBanner) && (!until || new Date(until) > new Date());
  return { on, until: on ? until : null };
}

function summarize(d: NewsDoc): PostSummary {
  const img = typeof d.featuredImage === "object" && d.featuredImage ? d.featuredImage : null;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const videoId = d.cloudinaryVideo?.publicId ?? null;
  return {
    id: d.id,
    title: d.title ?? "",
    message: d.message ?? "",
    date: d.publishedDate ?? d.createdAt ?? "",
    sitePath: `/news/${d.slug ?? ""}`,
    thumbUrl: videoId && cloud ? `https://res.cloudinary.com/${cloud}/video/upload/so_1/${videoId}.jpg` : (img?.sizes?.thumbnail?.url ?? img?.url ?? null),
    hasVideo: Boolean(videoId || d.featuredVideo),
    banner: bannerOf(d),
    social: PLATFORMS.filter((p) => d.socialMedia?.[p.status] === "posted").map((p) => p.label),
  };
}

export async function listPosts(s: S): Promise<PostSummary[]> {
  const res = await s.payload.find({
    collection: COLLECTION,
    where: { _status: { equals: "published" } },
    sort: "-publishedDate",
    limit: 40,
    depth: 1,
    overrideAccess: false,
    user: s.user,
  });
  return (res.docs as unknown as NewsDoc[]).map(summarize);
}

export async function getPost(s: S, id: string): Promise<PostSummary | null> {
  try {
    const d = (await s.payload.findByID({ collection: COLLECTION, id, draft: false, depth: 1, overrideAccess: false, user: s.user })) as unknown as NewsDoc;
    return summarize(d);
  } catch {
    return null;
  }
}

async function liveDoc(s: S, id: number | string, trash = false) {
  return (await s.payload.findByID({ collection: COLLECTION, id, draft: false, depth: 0, trash, overrideAccess: false, user: s.user })) as unknown as NewsDoc &
    Record<string, unknown>;
}

function liveData(doc: Record<string, unknown>) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = doc;
  return data;
}

export function bannerEnd(choice: { on: boolean; days: number | null }): string | null {
  if (!choice.on || !choice.days) return null;
  // "For 1 day" = through the end of today, at the restaurant.
  return businessMidnight(addDays(businessToday(), choice.days));
}

/** Only one banner at a time: turning one on turns the others off (re-sending their live content). */
export async function clearOtherBanners(s: S, keepId: number | string) {
  const others = await s.payload.find({
    collection: COLLECTION,
    where: { and: [{ showAsHomepageBanner: { equals: true } }, { id: { not_equals: keepId } }] },
    depth: 0,
    limit: 20,
    overrideAccess: false,
    user: s.user,
  });
  for (const o of others.docs as unknown as Record<string, unknown>[]) {
    const live = await liveDoc(s, o.id as number | string);
    await s.payload.update({
      collection: COLLECTION,
      id: o.id as number | string,
      draft: false,
      overrideAccess: false,
      user: s.user,
      data: { ...liveData(live), showAsHomepageBanner: false, bannerEndDate: null, _status: "published" } as never,
      context: { skipSocialPostHook: true },
    });
  }
}

/** What Undo needs: the post's earlier words and banner, and which save it undoes. */
export type PostUndo = {
  id: number | string;
  expectUpdatedAt: string;
  previous: { message: string; showAsHomepageBanner: boolean; bannerEndDate: string | null; overlayText: string | null };
};

async function writePost(
  s: S,
  id: number | string,
  next: { message: string; showAsHomepageBanner: boolean; bannerEndDate: string | null; overlayText?: string | null },
  activity: string,
): Promise<{ undo: PostUndo }> {
  const live = await liveDoc(s, id);
  const video = live.cloudinaryVideo ?? null;
  const previous = {
    message: live.message ?? "",
    showAsHomepageBanner: Boolean(live.showAsHomepageBanner),
    bannerEndDate: live.bannerEndDate ?? null,
    overlayText: video?.overlayText ?? null,
  };
  // The words on the video came from the post's first line. If they still
  // match it, they follow the fix (a typo on the video gets fixed too).
  let cloudinaryVideo = video;
  if (video?.publicId) {
    const overlayText =
      next.overlayText !== undefined
        ? next.overlayText
        : video.overlayText === captionFromMessage(previous.message)
          ? captionFromMessage(next.message)
          : video.overlayText;
    cloudinaryVideo = { ...video, overlayText, confirmedOverlayText: overlayText } as typeof video;
  }
  const updated = (await s.payload.update({
    collection: COLLECTION,
    id,
    draft: false,
    depth: 0,
    overrideAccess: false,
    user: s.user,
    data: {
      ...liveData(live),
      message: next.message,
      // The heading on the News page follows the words; the web address stays the same.
      title: deriveTitleFromMessage(next.message),
      showAsHomepageBanner: next.showAsHomepageBanner,
      bannerEndDate: next.showAsHomepageBanner ? next.bannerEndDate : null,
      ...(cloudinaryVideo ? { cloudinaryVideo } : {}),
      _status: "published",
    } as never,
    context: { skipSocialPostHook: true },
  })) as unknown as NewsDoc;
  if (next.showAsHomepageBanner) await clearOtherBanners(s, id);
  await logActivity(s.payload, { summary: `${activity}: “${updated.title ?? ""}”`, area: "post", who: s.user.email });
  return { undo: { id, expectUpdatedAt: updated.updatedAt ?? "", previous } };
}

async function failed(s: S, summary: string, err: unknown) {
  await logActivity(s.payload, { summary, status: "failed", area: "post", who: s.user.email });
  s.payload.logger.error(`[manage/posts] ${err instanceof Error ? err.message : String(err)}`);
}

export async function updatePost(
  s: S,
  input: { id: number | string; message: string; banner: BannerChoice },
): Promise<Result<{ undo: PostUndo; post: PostSummary | null }>> {
  const message = (input.message ?? "").trim();
  if (!message) return { ok: false, message: "The post needs some words. Type something, or take the post off the website instead." };
  const days = input.banner.days;
  if (days !== null && days !== "keep" && !BANNER_DAY_CHOICES.includes(days as never)) return { ok: false, message: SOMETHING_WRONG };
  try {
    const before = await liveDoc(s, input.id);
    const wasBanner = bannerOf(before).on;
    const wordsChanged = (before.message ?? "").trim() !== message;
    // Keep the existing end date unless the owner picked a new one.
    const end =
      days === "keep" ? (input.banner.on && wasBanner ? (before.bannerEndDate ?? null) : null) : bannerEnd({ on: input.banner.on, days });
    const activity = wordsChanged
      ? "Fixed the words of a post"
      : input.banner.on && !wasBanner
        ? "Put a post on the home page banner"
        : !input.banner.on && wasBanner
          ? "Took a post off the home page banner"
          : "Changed how long a post stays on the home page banner";
    const r = await writePost(s, input.id, { message, showAsHomepageBanner: input.banner.on, bannerEndDate: end }, activity);
    return { ok: true, undo: r.undo, post: await getPost(s, String(input.id)) };
  } catch (err) {
    await failed(s, "Couldn't save a change to a post", err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function undoPostChange(s: S, token: PostUndo): Promise<Result> {
  try {
    const live = await liveDoc(s, token.id);
    if (live.updatedAt !== token.expectUpdatedAt) {
      return { ok: false, message: "This post was changed again after you, so it can't be undone from here. Please reach out for help." };
    }
    await writePost(
      s,
      token.id,
      {
        message: String(token.previous.message ?? ""),
        showAsHomepageBanner: Boolean(token.previous.showAsHomepageBanner),
        bannerEndDate: token.previous.bannerEndDate ?? null,
        overlayText: token.previous.overlayText,
      },
      "Undid a change to a post",
    );
    return { ok: true };
  } catch (err) {
    await failed(s, "Couldn't undo a change to a post", err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function removePost(s: S, id: number | string): Promise<Result> {
  try {
    // collections/News.ts keeps the live content intact when trashing (and
    // never posts anything), so putting it back restores it exactly.
    await s.payload.update({
      collection: COLLECTION,
      id,
      overrideAccess: false,
      user: s.user,
      data: { deletedAt: new Date().toISOString() } as never,
    });
    return { ok: true };
  } catch (err) {
    await failed(s, "Couldn't take a post off the website", err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function restorePost(s: S, id: number | string): Promise<Result> {
  try {
    await s.payload.update({
      collection: COLLECTION,
      id,
      trash: true,
      overrideAccess: false,
      user: s.user,
      // Back on the website, but not back on the home page banner.
      data: { deletedAt: null, showAsHomepageBanner: false, bannerEndDate: null } as never,
    });
    return { ok: true };
  } catch (err) {
    await failed(s, "Couldn't put a post back on the website", err);
    return { ok: false, message: SOMETHING_WRONG };
  }
}

export async function listRemovedPosts(s: S): Promise<{ id: number | string; title: string; removedAt: string }[]> {
  const res = await s.payload.find({
    collection: COLLECTION,
    trash: true,
    where: { deletedAt: { exists: true } },
    sort: "-deletedAt",
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user: s.user,
  });
  return (res.docs as unknown as NewsDoc[]).map((d) => ({ id: d.id, title: d.title ?? "(no words)", removedAt: d.deletedAt ?? "" }));
}
