import type { TextFieldSingleValidation } from "payload";

// Shared by any field that stores a hand-typed destination — an internal
// path, a tel:/mailto: link, or a full URL — instead of Payload's built-in
// URL/relationship field types (see blocks/CallToActionBlock.ts's own
// comment for why: it needs to hold all of those shapes, which no single
// built-in field type covers). Catches the same class of mistake that
// broke News' slug before resolveAutoSlug (lib/slugify.ts) started
// normalizing it: a stray leading/trailing space, a missing leading
// slash, or a bare domain typed without its protocol all save fine as
// plain text — Payload has no reason to reject them — but render as a
// broken link with zero error shown anywhere. A customer clicking the
// card/button is usually the first anyone finds out.
//
// Deliberately validates rather than auto-corrects (unlike the slug
// fix): unlike a slug, there's no single unambiguous "normalized" form to
// silently rewrite a bad value into (is "example.com" supposed to become
// "https://example.com" or "/example.com"?), so this asks the editor to
// fix it themselves with a plain-language explanation instead of guessing.
export const validateHref: TextFieldSingleValidation = (value) => {
  if (!value) return true; // `required` (set per-field) handles the empty case

  if (value !== value.trim()) {
    return "Remove the extra space(s) at the start or end — they'll break the link.";
  }
  if (/\s/.test(value)) {
    return "Links can't contain spaces.";
  }
  if (
    value.startsWith("/") ||
    value.startsWith("tel:") ||
    value.startsWith("mailto:") ||
    /^https?:\/\//.test(value)
  ) {
    return true;
  }
  return 'Links need to start with "/" (a page on this site), "tel:", "mailto:", or "https://" — e.g. "/catering" or "https://example.com", not "example.com".';
};
