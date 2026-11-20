import JsonLd from "@/components/JsonLd";
import { getRestaurantSchema } from "@/lib/businessInfoServer";

// The site-wide Restaurant/LocalBusiness JSON-LD, built from the live
// business info (globals/BusinessInfo.ts) so search engines see the same
// phone, address and hours as the page itself.
export default async function RestaurantJsonLd({ extra }: { extra?: Record<string, unknown> }) {
  return <JsonLd data={await getRestaurantSchema(extra)} />;
}
