import { isPlatformLive, platformInfo, SOCIAL_PLATFORMS, type PlatformInfo } from "@/lib/socialPost";

export type PostablePlatform = PlatformInfo & {
  /** Not really connected — posting is simulated (local development only). */
  isTest: boolean;
};

/**
 * The social platforms /manage offers. Only platforms that are genuinely
 * connected (real Post for Me credentials) are shown — otherwise the owner
 * would see "Posted ✓" for a post that never left the building. Right now
 * that's Facebook only; Instagram/TikTok appear automatically once their
 * account ids are set in Vercel.
 *
 * Exception, local development only: with nothing connected, Facebook is
 * offered in clearly-labeled test mode so the flow can be exercised.
 */
export function getPostablePlatforms(): PostablePlatform[] {
  const live = SOCIAL_PLATFORMS.filter(isPlatformLive).map((p) => ({ ...platformInfo(p), isTest: false }));
  if (live.length > 0 || process.env.NODE_ENV === "production") return live;
  return [{ ...platformInfo("facebook"), isTest: true }];
}
