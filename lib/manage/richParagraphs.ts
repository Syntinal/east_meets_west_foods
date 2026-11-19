// Turns a Payload rich-text field into a simple list of paragraphs the owner
// can edit as plain text, and back.
//
// A paragraph (or heading) stays editable even when it has LINKS or BOLD /
// ITALIC words: those are kept as "spans" — character ranges over the plain
// text. As the owner types, spans move with the text (see adjustSpans), so
// a link stays on its words and bold words stay bold. Typing inside a bold
// or linked phrase keeps it bold/linked; deleting all of its words removes
// it. Links can also be changed, removed or added (see the paragraph editor).
// A paragraph that is bold all the way through (e.g. the store hours) keeps
// being bold all the way through.
//
// Still "locked" (shown read-only, written back exactly as it was): lists,
// links to a specific Payload document ("internal" links), and anything else
// unusual — so nothing silently loses its structure. Those stay in /admin.

type Node = { type?: string; text?: string; format?: number | string; style?: string; children?: Node[]; [k: string]: unknown };
export type RichText = { root: Node & { children: Node[] } } | null | undefined;

/** A text node's look, minus its text: bold/italic bits, inline style, and Lexical's extra `$` state (colors, fonts). */
export type TextLook = { format?: number; style?: string; $?: unknown };
export type SpanLink = { url: string; newTab?: boolean };
/** A styled or linked piece of a paragraph: characters [start, end) of its text. */
export type Span = { start: number; end: number; look?: TextLook; link?: SpanLink };

export type Paragraph =
  /** Editable. `from` is the original paragraph's position, kept so an unchanged one is written back untouched. */
  | { kind: "plain"; text: string; spans?: Span[]; from?: number }
  /** Read-only: written back as the original node at position `from`. */
  | { kind: "locked"; text: string; from: number };

const PLAIN_LOOK: TextLook = { format: 0, style: "" };

function lookOf(n: Node): TextLook {
  return {
    format: typeof n.format === "number" ? n.format : 0,
    style: typeof n.style === "string" ? n.style : "",
    ...(n.$ !== undefined ? { $: n.$ } : {}),
  };
}
const sameLook = (a: TextLook, b: TextLook) => JSON.stringify(a) === JSON.stringify(b);
const isPlainLook = (l: TextLook) => !l.format && !l.style && l.$ === undefined;

export function isSafeHref(url: string): boolean {
  return /^(\/(?!\/)|#|tel:|mailto:|https?:\/\/)/i.test(url) && !/\s/.test(url);
}

function textOf(node: Node): string {
  if (node.type === "linebreak") return "\n";
  if (typeof node.text === "string") return node.text;
  return (node.children ?? []).map(textOf).join("");
}

type Parsed = { text: string; spans: Span[]; base: TextLook };

/** null = not editable here (locked). */
function parseBlock(node: Node): Parsed | null {
  if (node.type !== "paragraph" && node.type !== "heading") return null;
  const children = node.children ?? [];

  // Decide the paragraph's "base" look: if every loose text node looks the
  // same (all plain, or all bold like the store hours), that's the base;
  // otherwise the base is plain and the odd ones out become spans.
  const loose = children.filter((c) => c.type === "text");
  const looks = loose.map(lookOf);
  const base = looks.length && looks.every((l) => sameLook(l, looks[0])) ? looks[0] : PLAIN_LOOK;

  let text = "";
  const spans: Span[] = [];
  for (const c of children) {
    if (c.type === "linebreak") {
      text += "\n";
    } else if (c.type === "text") {
      const t = c.text ?? "";
      const look = lookOf(c);
      if (!sameLook(look, base) && t) spans.push({ start: text.length, end: text.length + t.length, look });
      text += t;
    } else if (c.type === "link") {
      const fields = (c.fields ?? {}) as { url?: unknown; newTab?: unknown; linkType?: unknown };
      if (fields.linkType && fields.linkType !== "custom") return null;
      if (typeof fields.url !== "string") return null;
      const kids = c.children ?? [];
      if (!kids.every((k) => k.type === "text")) return null;
      const kidLooks = kids.map(lookOf);
      if (kidLooks.some((l) => !sameLook(l, kidLooks[0]))) return null;
      const t = kids.map((k) => k.text ?? "").join("");
      if (!t) continue;
      const look = kidLooks[0] ?? PLAIN_LOOK;
      spans.push({
        start: text.length,
        end: text.length + t.length,
        link: { url: fields.url, newTab: Boolean(fields.newTab) },
        ...(sameLook(look, base) ? {} : { look }),
      });
      text += t;
    } else {
      return null;
    }
  }
  return { text, spans, base };
}

export function toParagraphs(rich: RichText): Paragraph[] {
  const nodes = rich?.root?.children ?? [];
  return nodes.map((node, i): Paragraph => {
    const parsed = parseBlock(node);
    if (!parsed) return { kind: "locked", text: textOf(node), from: i };
    return { kind: "plain", text: parsed.text, ...(parsed.spans.length ? { spans: parsed.spans } : {}), from: i };
  });
}

// ---------- Keeping spans on the right words while typing ----------

/**
 * After the text changes from `before` to `after` (one edit, as a textarea
 * reports it), moves each span so it stays on the same words. Typing
 * inside a span grows it; typing right at its edge doesn't; deleting all of
 * a span's words removes the span.
 */
export function adjustSpans(spans: Span[] | undefined, before: string, after: string): Span[] {
  if (!spans?.length) return [];
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0;
  while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  const oldEnd = before.length - s; // edited region in `before`: [p, oldEnd)
  const newLen = after.length - s - p; // replaced by this many characters
  const delta = after.length - before.length;
  return spans
    .map((sp) => {
      const start = sp.start < p ? sp.start : sp.start >= oldEnd ? sp.start + delta : p;
      const end = sp.end <= p ? sp.end : sp.end >= oldEnd ? sp.end + delta : p + newLen;
      return { ...sp, start, end };
    })
    .filter((sp) => sp.end > sp.start);
}

/** Valid, sorted, non-overlapping spans within `text`. */
function cleanSpans(spans: Span[] | undefined, text: string): Span[] {
  const out: Span[] = [];
  const sorted = [...(spans ?? [])]
    .filter((sp) => Number.isInteger(sp.start) && Number.isInteger(sp.end) && sp.start >= 0 && sp.end <= text.length && sp.start < sp.end)
    .sort((a, b) => a.start - b.start);
  for (const sp of sorted) {
    if (out.length && sp.start < out[out.length - 1].end) continue;
    const link = sp.link && typeof sp.link.url === "string" && isSafeHref(sp.link.url.trim()) ? { url: sp.link.url.trim(), newTab: Boolean(sp.link.newTab) } : undefined;
    const look = sp.look && typeof sp.look === "object" ? sp.look : undefined;
    if (!link && !look) continue;
    out.push({ start: sp.start, end: sp.end, ...(link ? { link } : {}), ...(look ? { look } : {}) });
  }
  return out;
}

/** Finds `words` in `text` outside any existing span. Returns the new span's range, or null. */
export function findWords(text: string, spans: Span[] | undefined, words: string): { start: number; end: number } | null {
  const w = words.trim();
  if (!w) return null;
  const hay = text.toLowerCase();
  const needle = w.toLowerCase();
  let at = hay.indexOf(needle);
  while (at !== -1) {
    const end = at + w.length;
    if (!(spans ?? []).some((sp) => sp.link && at < sp.end && end > sp.start)) return { start: at, end };
    at = hay.indexOf(needle, at + 1);
  }
  return null;
}

// ---------- Writing back ----------

function textNode(text: string, look: TextLook): Node {
  return {
    mode: "normal",
    text,
    type: "text",
    style: look.style ?? "",
    detail: 0,
    format: look.format ?? 0,
    version: 1,
    ...(look.$ !== undefined ? { $: look.$ } : {}),
  };
}

/** Text (with \n line breaks) as text + linebreak nodes. */
function inlineNodes(text: string, look: TextLook): Node[] {
  const out: Node[] = [];
  text.split("\n").forEach((part, i) => {
    if (i > 0) out.push({ type: "linebreak", version: 1 });
    if (part) out.push(textNode(part, look));
  });
  return out;
}

const PLAIN_SHELL: Node = { type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr", textStyle: "", textFormat: 0 };

function buildBlock(shell: Node, base: TextLook, text: string, spans: Span[], offset: number, linkShells: Map<string, Node>): Node {
  const children: Node[] = [];
  let pos = 0;
  for (const sp of spans) {
    const a = sp.start - offset;
    const b = sp.end - offset;
    if (a > pos) children.push(...inlineNodes(text.slice(pos, a), base));
    const piece = text.slice(a, b);
    const look = sp.look ?? base;
    if (sp.link) {
      const linkShell = linkShells.get(sp.link.url) ?? { type: "link", format: "", indent: 0, version: 3, direction: "ltr" };
      const prevFields = (linkShell.fields ?? {}) as Record<string, unknown>;
      children.push({
        ...linkShell,
        fields: { ...prevFields, url: sp.link.url, newTab: Boolean(sp.link.newTab), linkType: "custom" },
        children: inlineNodes(piece, look),
      });
    } else {
      children.push(...inlineNodes(piece, look));
    }
    pos = b;
  }
  if (pos < text.length) children.push(...inlineNodes(text.slice(pos), base));
  return { ...shell, children };
}

function sameParsed(orig: Parsed, text: string, spans: Span[]): boolean {
  return orig.text === text && JSON.stringify(cleanSpans(orig.spans, orig.text)) === JSON.stringify(spans);
}

/**
 * Rebuilds the rich-text value from edited paragraphs. A blank line inside
 * one box splits it into separate paragraphs; empty boxes are dropped.
 * Unchanged and locked paragraphs reuse the original node exactly; an
 * edited one keeps its original paragraph/heading settings and base look.
 */
export function fromParagraphs(paragraphs: Paragraph[], original: RichText): NonNullable<RichText> {
  const originals = original?.root?.children ?? [];
  const children: Node[] = [];
  for (const p of paragraphs) {
    if (p.kind === "locked") {
      if (originals[p.from]) children.push(originals[p.from]);
      continue;
    }
    const text = typeof p.text === "string" ? p.text : "";
    const spans = cleanSpans(p.spans, text);
    const orig = p.from !== undefined ? originals[p.from] : undefined;
    const parsed = orig ? parseBlock(orig) : null;
    if (orig && parsed && sameParsed(parsed, text, spans)) {
      children.push(orig);
      continue;
    }
    const { children: _c, ...shellProps } = orig && parsed ? orig : PLAIN_SHELL;
    const shell = shellProps as Node;
    const base = parsed?.base ?? PLAIN_LOOK;
    // Reuse the original link node settings (e.g. its version) for links that are still there.
    const linkShells = new Map<string, Node>();
    for (const c of orig?.children ?? []) {
      if (c.type === "link" && typeof (c.fields as { url?: unknown })?.url === "string") {
        const { children: _k, ...ls } = c;
        linkShells.set((c.fields as { url: string }).url, ls as Node);
      }
    }
    // Split on blank lines into separate paragraphs, keeping each span with its words.
    const re = /\n\s*\n/g;
    let chunkStart = 0;
    const ranges: [number, number][] = [];
    for (let m = re.exec(text); m; m = re.exec(text)) {
      ranges.push([chunkStart, m.index]);
      chunkStart = m.index + m[0].length;
    }
    ranges.push([chunkStart, text.length]);
    for (let [a, b] of ranges) {
      while (a < b && text[a] === "\n") a++;
      while (b > a && text[b - 1] === "\n") b--;
      const chunk = text.slice(a, b);
      if (!chunk.trim()) continue;
      const inside = spans
        .filter((sp) => sp.end > a && sp.start < b)
        .map((sp) => ({ ...sp, start: Math.max(sp.start, a), end: Math.min(sp.end, b) }));
      children.push(buildBlock(shell, base, chunk, inside, a, linkShells));
    }
  }
  const root = original?.root ?? { type: "root", format: "", indent: 0, version: 1, direction: "ltr", children: [] };
  return { root: { ...root, children } };
}

export function paragraphsText(paragraphs: Paragraph[]): string {
  return paragraphs.map((p) => p.text).join("\n\n");
}

/** Links in a paragraph, with their words — for showing the owner. */
export function linksIn(p: Paragraph): { index: number; words: string; url: string }[] {
  if (p.kind !== "plain") return [];
  return (p.spans ?? []).flatMap((sp, index) => (sp.link ? [{ index, words: p.text.slice(sp.start, sp.end), url: sp.link.url }] : []));
}
