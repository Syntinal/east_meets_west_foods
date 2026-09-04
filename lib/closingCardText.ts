import { restaurantSchema } from "./structuredData";

// The fixed brand-name + website text baked onto the last card of a Video
// Studio video when "Add a closing card" is checked (see
// collections/News.ts's cloudinaryVideo.addClosingCard and
// lib/cloudinaryVideo.ts's buildOverlayVideoUrl, which puts this in the
// final "card" slot). Every promo video in the owner's boss's reference
// example ends on a card like this — see CLAUDE.md's Video Studio entries.
// Sourced from lib/structuredData.ts's own restaurantSchema (the site's real
// JSON-LD business data) rather than re-typed here, so it can never drift
// from the site's actual name/domain. Deliberately not owner-editable — same
// "developer needed to change something this structural" reasoning as e.g.
// globals/Contact.ts's map embed staying hardcoded.
//
// Plain function (not a constant) so a future caller could parameterize it
// without a signature change; both current callers (the Video Studio's
// client-side preview and the News afterChange hook's server-side social
// post) call it with no arguments today.
export function buildClosingCardText(): string {
  const domain = restaurantSchema.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${restaurantSchema.name}\n${domain}`;
}
