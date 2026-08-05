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
