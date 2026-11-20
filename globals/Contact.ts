import type { GlobalConfig, TextFieldSingleValidation } from "payload";
import { revalidatePath } from "next/cache";
import { pageActivityHook } from "@/lib/activityLog";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// ContactView.tsx's toTelHref() builds the click-to-call link by stripping
// everything but digits and assuming exactly 10 remain (or 11 starting
// with a leading "1") — that assumption is only documented in a comment
// there, never checked here. A typo (a dropped or doubled digit) or a
// pasted-in extension ("...6283 ext 2") saves fine as plain text and
// silently produces a tel: link that dials the wrong number or an invalid
// one — nothing on screen would say so. Catches that at save time instead.
const validatePhone: TextFieldSingleValidation = (value) => {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) return true;
  return 'That doesn\'t look like a complete phone number — enter all 10 digits, e.g. "(208) 627-6283".';
};

// The Contact page, previously hand-coded HTML — now editable.
// The address, phone and map now come from globals/BusinessInfo.ts ("Hours,
// Address & Phone"), shared with the footer, Google and Facebook. This
// global only holds the Contact page's own wording.
export const Contact: GlobalConfig = {
  slug: "contact",
  label: "Contact",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    preview: () => getPreviewURL("/contact"),
    livePreview: {
      url: () => getPreviewURL("/contact"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/contact"), pageActivityHook("Contact")],
  },
  fields: [
    { name: "heading", type: "text", admin: { description: "The page heading." } },
    { name: "subtitle", type: "text", admin: { description: "Short line under the business name." } },
    // Superseded by globals/BusinessInfo.ts (the one source for address,
    // phone and hours, which also feeds Google/Facebook). Kept, hidden, only
    // so the database columns aren't dropped; nothing reads them anymore.
    { name: "address", type: "textarea", admin: { hidden: true } },
    { name: "phone", type: "text", admin: { hidden: true }, validate: validatePhone },
    { name: "blurb", type: "textarea", admin: { description: "Short line about the location, shown under the phone number." } },
    {
      name: "mapLinkText",
      type: "text",
      defaultValue: "Open in Google Maps →",
      admin: { description: "Text on the link that opens the map in a new tab." },
    },
  ],
};
