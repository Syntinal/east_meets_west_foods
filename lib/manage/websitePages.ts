import { fromParagraphs, toParagraphs, type Paragraph, type RichText } from "./richParagraphs";

// The website pages /manage can change, broken into the sections the owner
// sees on the page itself. Each section lists its fields by their real path
// in the page's Payload global (globals/*.ts). Things deliberately left to
// /admin (teaser cards, technical/SEO tags) are named in `elsewhere`.

export type PageSlug = "home" | "sauce" | "story" | "faq" | "contact";
export type FieldKind = "text" | "textarea" | "photo" | "paragraphs" | "faq" | "gallery";
export type FieldDef = { path: string; label: string; kind: FieldKind; hint?: string };
export type SectionDef = { key: string; title: string; fields: FieldDef[] };
export type PageDef = { slug: PageSlug; label: string; icon: string; sitePath: string; sections: SectionDef[]; elsewhere?: string };

export type Photo = { id: number | string; url: string | null };
export type FaqRow = { id?: string; question: string; answer: Paragraph[] };
export type GalleryRow = { id?: string; image: Photo | null; caption: string };
export type FieldValue = string | Photo | null | Paragraph[] | FaqRow[] | GalleryRow[];

const SMALL_LABEL = "Small label above the heading";

const storyLikeSections = (bodyLabel: string): SectionDef[] => [
  { key: "hero", title: "Big photo at the top", fields: [{ path: "hero.image", label: "Photo", kind: "photo" }] },
  {
    key: "content",
    title: "Heading and text",
    fields: [
      { path: "content.heading", label: "Heading", kind: "text" },
      { path: "content.body", label: bodyLabel, kind: "paragraphs" },
    ],
  },
  {
    key: "pullQuote",
    title: "Quote",
    fields: [
      { path: "pullQuote.quote", label: "The quote", kind: "text" },
      { path: "pullQuote.citation", label: "Who said it", kind: "text", hint: "Example: — Roger, Owner" },
    ],
  },
];

export const WEBSITE_PAGES: PageDef[] = [
  {
    slug: "home",
    label: "Home page",
    icon: "🏠",
    sitePath: "/",
    sections: [
      {
        key: "logo",
        title: "Logo and tagline",
        fields: [
          { path: "header.logoImage", label: "Logo", kind: "photo" },
          { path: "header.tagline", label: "Tagline", kind: "text" },
        ],
      },
      { key: "hero", title: "Big photo at the top", fields: [{ path: "hero.image", label: "Photo", kind: "photo" }] },
      {
        key: "mission",
        title: "Our mission",
        fields: [
          { path: "mission.eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "mission.heading", label: "Heading", kind: "text" },
          { path: "mission.statement", label: "Mission statement", kind: "textarea" },
          { path: "mission.location", label: "Location line", kind: "text" },
        ],
      },
      {
        key: "gallery",
        title: "Photo gallery",
        fields: [
          { path: "gallery.eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "gallery.heading", label: "Heading", kind: "text" },
          { path: "gallery.photos", label: "Photos", kind: "gallery" },
        ],
      },
      {
        key: "testimonialsSection",
        title: "Customer reviews heading",
        fields: [
          { path: "testimonialsSection.eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "testimonialsSection.heading", label: "Heading", kind: "text" },
        ],
      },
      {
        key: "seo",
        title: "Text near the bottom",
        fields: [
          { path: "seo.eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "seo.heading", label: "Heading", kind: "text" },
          { path: "seo.body", label: "Text", kind: "paragraphs" },
        ],
      },
    ],
    elsewhere: "The small cards that link to other pages, and the announcement banner's labels",
  },
  { slug: "sauce", label: "Our Sauce", icon: "🥢", sitePath: "/sauce", sections: storyLikeSections("Text") },
  { slug: "story", label: "Our Story", icon: "📖", sitePath: "/story", sections: storyLikeSections("The story") },
  {
    slug: "faq",
    label: "Questions (FAQ)",
    icon: "❓",
    sitePath: "/faq",
    sections: [
      {
        key: "top",
        title: "Top of the page",
        fields: [
          { path: "eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "heading", label: "Heading", kind: "text" },
        ],
      },
      { key: "questions", title: "Questions and answers", fields: [{ path: "questions", label: "Questions", kind: "faq" }] },
    ],
  },
  {
    slug: "contact",
    label: "Contact",
    icon: "📍",
    sitePath: "/contact",
    sections: [
      {
        key: "top",
        title: "Top of the page",
        fields: [
          { path: "heading", label: "Heading", kind: "text" },
          { path: "subtitle", label: "Line under the heading", kind: "text" },
        ],
      },
      {
        key: "details",
        title: "Address and phone",
        fields: [
          { path: "address", label: "Address", kind: "textarea" },
          { path: "phone", label: "Phone number", kind: "text" },
        ],
      },
      {
        key: "extra",
        title: "Extra details",
        fields: [
          { path: "blurb", label: "Extra text", kind: "textarea" },
          { path: "mapLinkText", label: "Words on the map link", kind: "text" },
        ],
      },
    ],
    elsewhere: "Moving the map pin (if the address changes, ask for help so the map moves too)",
  },
];

export const getPageDef = (slug: string) => WEBSITE_PAGES.find((p) => p.slug === slug) ?? null;

// ---------- Reading and writing field values ----------

type Doc = Record<string, unknown>;

function getPath(doc: Doc | null | undefined, path: string): unknown {
  return path.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Doc)[k] : undefined), doc);
}

function setPath(target: Doc, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = target;
  keys.slice(0, -1).forEach((k) => {
    cur[k] = (cur[k] as Doc) ?? {};
    cur = cur[k] as Doc;
  });
  cur[keys[keys.length - 1]] = value;
}

function toPhoto(v: unknown): Photo | null {
  if (v && typeof v === "object" && "id" in v) {
    const o = v as { id: number | string; url?: string | null };
    return { id: o.id, url: o.url ?? null };
  }
  return null;
}

/** Field value as the /manage screens show it. `doc` must be fetched with depth >= 1 so photos have URLs. */
export function readField(doc: Doc | null | undefined, field: FieldDef): FieldValue {
  const raw = getPath(doc, field.path);
  switch (field.kind) {
    case "text":
    case "textarea":
      return typeof raw === "string" ? raw : "";
    case "photo":
      return toPhoto(raw);
    case "paragraphs":
      return toParagraphs(raw as RichText);
    case "faq":
      return ((raw as Doc[]) ?? []).map((row) => ({
        id: row.id as string | undefined,
        question: (row.question as string) ?? "",
        answer: toParagraphs(row.answer as RichText),
      }));
    case "gallery":
      return ((raw as Doc[]) ?? []).map((row) => ({
        id: row.id as string | undefined,
        image: toPhoto(row.image),
        caption: (row.caption as string) ?? "",
      }));
  }
}

/** Turns edited section values into the partial `data` object for updateGlobal. */
export function buildSectionData(section: SectionDef, values: Record<string, FieldValue>, latest: Doc): Doc {
  const data: Doc = {};
  for (const field of section.fields) {
    if (!(field.path in values)) continue;
    const v = values[field.path];
    let out: unknown;
    switch (field.kind) {
      case "text":
      case "textarea":
        out = typeof v === "string" ? v.trim() : "";
        break;
      case "photo":
        out = (v as Photo | null)?.id ?? null;
        break;
      case "paragraphs":
        out = fromParagraphs(v as Paragraph[], getPath(latest, field.path) as RichText);
        break;
      case "faq": {
        const originals = ((getPath(latest, field.path) as Doc[]) ?? []) as Doc[];
        out = (v as FaqRow[])
          .filter((row) => row.question.trim())
          .map((row) => {
            const orig = originals.find((o) => o.id === row.id);
            return { ...(row.id ? { id: row.id } : {}), question: row.question.trim(), answer: fromParagraphs(row.answer, orig?.answer as RichText) };
          });
        break;
      }
      case "gallery":
        out = (v as GalleryRow[])
          .filter((row) => row.image)
          .map((row) => ({ ...(row.id ? { id: row.id } : {}), image: row.image!.id, caption: row.caption }));
        break;
    }
    setPath(data, field.path, out);
  }
  return data;
}

/** Short plain-text version of a value, for "what changed" lists. */
export function describeValue(field: FieldDef, v: FieldValue): string {
  switch (field.kind) {
    case "text":
    case "textarea":
      return (v as string) || "(empty)";
    case "photo":
      return v ? `Photo #${(v as Photo).id}` : "(no photo)";
    case "paragraphs":
      return (v as Paragraph[]).map((p) => p.text).join(" ¶ ") || "(empty)";
    case "faq":
      return (v as FaqRow[]).map((r) => r.question).join(" · ") || "(no questions)";
    case "gallery":
      return `${(v as GalleryRow[]).length} photos`;
  }
}
