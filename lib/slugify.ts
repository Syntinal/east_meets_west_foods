// Shared by any collection that auto-derives a URL slug from a title
// (News, Pages). Lowercases, strips anything that isn't a letter/number,
// and collapses runs of separators into a single hyphen.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// The beforeValidate hook body shared by News and Pages: auto-fills slug
// from title when blank, and keeps it in sync with the title for as long
// as the slug hasn't been hand-customized.
//
// A naive "only fill when blank" version (what both collections used to
// have inline) breaks on autosave-enabled collections like these: the
// very first keystroke in Title fires an autosave that derives a slug
// from whatever's been typed so far (often just the first word) and
// saves it back into the form. From then on the slug field is never
// blank again, so every later save just re-normalizes that frozen value
// — title edits stop reaching the slug at all, even though the owner
// never touched Slug themselves.
//
// Fixed by comparing the incoming slug against slugify() of the
// *previous* title: if they still match, the slug was never hand-edited
// and it's safe (and expected) to re-derive it from the new title. If
// they don't match, the slug was deliberately customized, and that
// customization is respected from then on — later title edits only get
// slugify()'d re-normalization applied to the existing custom slug, never
// a fresh derivation from the title.
export function resolveAutoSlug<T extends { title?: unknown; slug?: unknown } | null | undefined>(
  data: T,
  originalDoc?: { title?: unknown; slug?: unknown } | null
): T {
  if (!data) return data;

  const title = typeof data.title === "string" ? data.title : undefined;
  const typedSlug = typeof data.slug === "string" ? data.slug : undefined;

  if (!typedSlug) {
    if (title) (data as Record<string, unknown>).slug = slugify(title);
    return data;
  }

  const previousTitle = typeof originalDoc?.title === "string" ? originalDoc.title : undefined;
  const previousSlug = typeof originalDoc?.slug === "string" ? originalDoc.slug : undefined;
  const slugStillMatchesPreviousTitle =
    Boolean(previousTitle) && Boolean(previousSlug) && previousSlug === slugify(previousTitle as string);

  (data as Record<string, unknown>).slug =
    title && slugStillMatchesPreviousTitle && title !== previousTitle ? slugify(title) : slugify(typedSlug);

  return data;
}
