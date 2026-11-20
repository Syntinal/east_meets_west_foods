import config from "@payload-config";
import { getPayload, type Payload } from "payload";
import { businessToday } from "@/lib/businessDate";
import { buildRestaurantSchema, DEFAULT_BUSINESS_INFO, normalizeBusinessInfo, type BusinessInfo } from "@/lib/businessInfo";

// Server-side read of globals/BusinessInfo.ts. overrideAccess because the
// global isn't publicly readable over the API (it has no drafts, so there's
// nothing unpublished to leak). Never throws: on any problem the website
// falls back to the last known defaults rather than a blank address.
export async function getBusinessInfo(payload?: Payload): Promise<BusinessInfo> {
  try {
    const p = payload ?? (await getPayload({ config }));
    const doc = await p.findGlobal({ slug: "business-info", overrideAccess: true, depth: 0 });
    return normalizeBusinessInfo(doc);
  } catch {
    return DEFAULT_BUSINESS_INFO;
  }
}

/** The site's Restaurant/LocalBusiness JSON-LD, built from the live business info. */
export async function getRestaurantSchema(extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  return { ...buildRestaurantSchema(await getBusinessInfo(), businessToday()), ...extra };
}
