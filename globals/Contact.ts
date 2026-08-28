import type { GlobalConfig, TextFieldSingleValidation } from "payload";
import { revalidatePath } from "next/cache";
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

// The Contact page, previously hand-coded HTML — now editable. The Google
// Maps embed/overlay link and the JSON-LD `hasMap` URL in
// app/(frontend)/contact/page.tsx stay hardcoded on purpose — both are
// derived from the address in a way that's fragile to regenerate from free
// text, and the business physically relocating is rare enough to accept as
// a documented limit (see the `address` field description below) rather
// than build address→geocoding.
//
// `address` and `phone` are also the site-wide footer's source of truth
// (app/(frontend)/layout.tsx fetches this global and passes them to
// Footer.tsx) — previously the footer had its own independently hardcoded
// copy that silently didn't follow edits made here. Editing them updates
// both the Contact page and the footer on every page.
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
    afterChange: [() => revalidatePath("/contact")],
  },
  fields: [
    { name: "heading", type: "text", admin: { description: "The page heading." } },
    { name: "subtitle", type: "text", admin: { description: "Short line under the business name." } },
    {
      name: "address",
      type: "textarea",
      admin: {
        description:
          "Shown on the page. Editing this fixes typos/display text only — the map embed and search-engine location data are separate and won't follow an address change automatically. If the business ever actually relocates, a developer needs to update those too.",
      },
    },
    {
      name: "phone",
      type: "text",
      admin: {
        description: 'e.g. "(208) 627-6283" — also used to build the click-to-call link (assumes a 10-digit US number).',
      },
      validate: validatePhone,
    },
    { name: "blurb", type: "textarea", admin: { description: "Short line about the location, shown under the phone number." } },
    {
      name: "mapLinkText",
      type: "text",
      defaultValue: "Open in Google Maps →",
      admin: { description: "Text on the link that opens the map in a new tab." },
    },
  ],
};
