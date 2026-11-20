import { fromParagraphs, toParagraphs, type Paragraph, type RichText } from "./richParagraphs";

// The website pages /manage can change, broken into the sections the owner
// sees on the page itself. Each section lists its fields by their real path
// in the page's Payload global (globals/*.ts). Things deliberately left to
// /admin (teaser cards, technical/SEO tags) are named in `elsewhere`.
//
// The owner's own custom pages (collections/Pages.ts, built from blocks in
// /admin) are handled too: buildCustomPageDef() turns each block into a
// section. Their slug here is "page-<id>"; a section's key is the block's
// id and its field paths are relative to that block.

/** Built-in pages backed by a Payload global. */
export type GlobalSlug = "home" | "sauce" | "story" | "faq" | "contact" | "menu-intro" | "news-intro" | "testimonials-intro";
/** A GlobalSlug, or "page-<id>" for a custom page. */
export type PageSlug = string;
export type FieldKind = "text" | "textarea" | "photo" | "paragraphs" | "faq" | "gallery" | "link" | "cards";
export type FieldDef = { path: string; label: string; kind: FieldKind; hint?: string };
/** `note` + no fields = shown, but changed in the regular editor (e.g. a video). */
export type SectionDef = { key: string; title: string; fields: FieldDef[]; note?: string };
export type PageDef = {
  slug: PageSlug;
  label: string;
  icon: string;
  sitePath: string;
  sections: SectionDef[];
  elsewhere?: string;
  /** Shown on the list of pages, under the label. */
  hint?: string;
  /** Short name for "Recent activity" ("Saved changes to the ___ page"). Defaults to label. */
  name?: string;
  source: { kind: "global"; slug: GlobalSlug } | { kind: "page"; id: number | string };
};

export type Photo = { id: number | string; url: string | null };
export type FaqRow = { id?: string; question: string; answer: Paragraph[] };
export type GalleryRow = { id?: string; image: Photo | null; caption: string };
export type CardRow = { id?: string; title: string; image: Photo | null; body: Paragraph[]; priceLine: string };
export type FieldValue = string | Photo | null | Paragraph[] | FaqRow[] | GalleryRow[] | CardRow[];

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

const g = (slug: GlobalSlug) => ({ slug, source: { kind: "global" as const, slug } });

export const WEBSITE_PAGES: PageDef[] = [
  {
    ...g("home"),
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
      {
        key: "announcementBanner",
        title: "Banner across the top (when a post is featured)",
        fields: [
          { path: "announcementBanner.badgeLabel", label: "Small label on the banner", kind: "text", hint: "Example: Announcement" },
          { path: "announcementBanner.linkText", label: "Words on the banner's link", kind: "text", hint: "Example: Read more →" },
        ],
      },
    ],
    elsewhere: "The small cards that link to other pages",
  },
  { ...g("sauce"), label: "Our Sauce", icon: "🥢", sitePath: "/sauce", sections: storyLikeSections("Text") },
  { ...g("story"), label: "Our Story", icon: "📖", sitePath: "/story", sections: storyLikeSections("The story") },
  {
    ...g("faq"),
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
    ...g("contact"),
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
        fields: [],
        note: 'The address and phone number are changed under "Hours, address & phone" on the home screen, so Google and Facebook get the change too.',
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
  {
    ...g("menu-intro"),
    label: "Menu page — heading and notes",
    name: "Menu (heading and notes)",
    hint: "The words above and below the menu (the dishes have their own button)",
    icon: "🥟",
    sitePath: "/menu",
    sections: [
      {
        key: "top",
        title: "Top of the menu",
        fields: [
          { path: "heading", label: "Heading", kind: "text" },
          { path: "lede", label: "Text under the heading", kind: "textarea" },
        ],
      },
      {
        key: "footer",
        title: "Notes at the bottom of the menu",
        fields: [
          { path: "footer.weeklyFlavorsNote", label: "First note (weekly flavors)", kind: "textarea" },
          { path: "footer.allergenNote", label: "Second note (allergies)", kind: "textarea" },
        ],
      },
    ],
  },
  {
    ...g("news-intro"),
    label: "News page — heading",
    name: "News (heading)",
    hint: "The words above your posts (the posts have their own button)",
    icon: "📰",
    sitePath: "/news",
    sections: [
      {
        key: "top",
        title: "Top of the page",
        fields: [
          { path: "eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "heading", label: "Heading", kind: "text" },
          { path: "lede", label: "Text under the heading", kind: "textarea" },
        ],
      },
      {
        key: "extras",
        title: "Small bits of text",
        fields: [
          { path: "readMoreText", label: "Words on each post's link", kind: "text", hint: "Example: Read more →" },
          { path: "emptyStateMessage", label: "Shown when there are no posts", kind: "text" },
        ],
      },
    ],
  },
  {
    ...g("testimonials-intro"),
    label: "Reviews page — heading",
    name: "Reviews (heading)",
    hint: "The words above the reviews (the reviews have their own button)",
    icon: "⭐",
    sitePath: "/testimonials",
    sections: [
      {
        key: "top",
        title: "Top of the page",
        fields: [
          { path: "eyebrow", label: SMALL_LABEL, kind: "text" },
          { path: "heading", label: "Heading", kind: "text" },
        ],
      },
    ],
  },
];

export const getPageDef = (slug: string) => WEBSITE_PAGES.find((p) => p.slug === slug) ?? null;

export const customPageSlug = (id: number | string) => `page-${id}`;
export const customPageId = (slug: string): string | null => (/^page-\d+$/.test(slug) ? slug.slice(5) : null);

type Block = { id?: string; blockType?: string; [k: string]: unknown };

/** One section per block, in page order. Repeated kinds are numbered ("Text 2"). */
export function buildCustomPageDef(doc: { id: number | string; title?: string; slug?: string; layout?: Block[] }): PageDef {
  const counts: Record<string, number> = {};
  const totals: Record<string, number> = {};
  for (const b of doc.layout ?? []) totals[b.blockType ?? ""] = (totals[b.blockType ?? ""] ?? 0) + 1;
  const sections: SectionDef[] = (doc.layout ?? []).flatMap((b): SectionDef[] => {
    if (!b.id) return [];
    const type = b.blockType ?? "";
    counts[type] = (counts[type] ?? 0) + 1;
    const n = (name: string) => (totals[type] > 1 ? `${name} ${counts[type]}` : name);
    switch (type) {
      case "richText":
        return [{ key: b.id, title: n("Text"), fields: [{ path: "content", label: "Text", kind: "paragraphs" }] }];
      case "image":
        return [
          {
            key: b.id,
            title: n("Photo"),
            fields: [
              { path: "image", label: "Photo", kind: "photo" },
              { path: "caption", label: "Small caption under the photo (optional)", kind: "text" },
            ],
          },
        ];
      case "gallery":
        return [{ key: b.id, title: n("Photo gallery"), fields: [{ path: "photos", label: "Photos", kind: "gallery" }] }];
      case "cta":
        return [
          {
            key: b.id,
            title: n("Button"),
            fields: [
              { path: "heading", label: "Heading above the button (optional)", kind: "text" },
              { path: "body", label: "Short text above the button (optional)", kind: "textarea" },
              { path: "buttonLabel", label: "Words on the button", kind: "text" },
              { path: "buttonHref", label: "Where the button goes", kind: "link" },
            ],
          },
        ];
      case "twoColumn":
        return [
          {
            key: b.id,
            title: n("Photo and text side by side"),
            fields: [
              { path: "left.image", label: "Left side — photo", kind: "photo" },
              { path: "left.content", label: "Left side — text", kind: "paragraphs" },
              { path: "right.image", label: "Right side — photo", kind: "photo" },
              { path: "right.content", label: "Right side — text", kind: "paragraphs" },
            ],
          },
        ];
      case "cardGrid":
        return [
          {
            key: b.id,
            title: n("Cards"),
            fields: [
              { path: "heading", label: "Heading above the cards (optional)", kind: "text" },
              { path: "cards", label: "Cards", kind: "cards" },
            ],
          },
        ];
      case "faq":
        return [
          {
            key: b.id,
            title: n("Questions and answers"),
            fields: [
              { path: "heading", label: "Heading (optional)", kind: "text" },
              { path: "questions", label: "Questions", kind: "faq" },
            ],
          },
        ];
      case "quote":
        return [
          {
            key: b.id,
            title: n("Quote"),
            fields: [
              { path: "quote", label: "The quote", kind: "textarea" },
              { path: "citation", label: "Who said it", kind: "text", hint: "Example: — Jane, Customer" },
            ],
          },
        ];
      case "video":
        return [{ key: b.id, title: n("Video"), fields: [], note: "Videos on this page are changed in the regular editor." }];
      case "storeHours":
        return [
          {
            key: b.id,
            title: n("Store hours"),
            fields: [],
            note: 'These hours fill in by themselves. Change them under "Hours, address & phone" on the home screen.',
          },
        ];
      case "file":
        return [{ key: b.id, title: n("File download"), fields: [], note: "Downloadable files are changed in the regular editor." }];
      default:
        return [{ key: b.id, title: n("Other content"), fields: [], note: "This part is changed in the regular editor." }];
    }
  });
  return {
    slug: customPageSlug(doc.id),
    label: doc.title || "(Untitled page)",
    icon: "📄",
    sitePath: `/${doc.slug ?? ""}`,
    sections,
    elsewhere: "The page's name and web address, adding or removing whole parts, and whether it's in the site's menu bar",
    source: { kind: "page", id: doc.id },
  };
}

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
    case "link":
      return typeof raw === "string" ? raw : "";
    case "photo":
      return toPhoto(raw);
    case "cards":
      return ((raw as Doc[]) ?? []).map((row) => ({
        id: row.id as string | undefined,
        title: (row.title as string) ?? "",
        image: toPhoto(row.image),
        body: toParagraphs(row.body as RichText),
        priceLine: (row.priceLine as string) ?? "",
      }));
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
      case "link":
        out = typeof v === "string" ? v.trim() : "";
        break;
      case "cards": {
        const originals = ((getPath(latest, field.path) as Doc[]) ?? []) as Doc[];
        out = (v as CardRow[])
          .filter((row) => row.title.trim())
          .map((row) => {
            const orig = originals.find((o) => o.id === row.id);
            return {
              ...(row.id ? { id: row.id } : {}),
              title: row.title.trim(),
              image: row.image?.id ?? null,
              body: fromParagraphs(row.body, orig?.body as RichText),
              priceLine: row.priceLine.trim(),
            };
          });
        break;
      }
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
    case "link":
      return (v as string) || "(empty)";
    case "cards":
      return (v as CardRow[]).map((r) => r.title).join(" · ") || "(no cards)";
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
