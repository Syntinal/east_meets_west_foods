// Turns a Payload rich-text field into a simple list of paragraphs the owner
// can edit as plain text, and back. Only paragraphs that are plain text are
// editable. A paragraph with a link, bold/italic, a heading, a list, etc. is
// "locked": shown read-only and written back exactly as it was, so nothing
// silently loses its link or formatting. (Changing those stays in /admin.)

type Node = { type?: string; text?: string; format?: number | string; style?: string; children?: Node[]; [k: string]: unknown };
export type RichText = { root: Node & { children: Node[] } } | null | undefined;

export type Paragraph =
  /** Editable. `from` is the original paragraph's position, kept so an unchanged one is written back untouched. */
  | { kind: "plain"; text: string; from?: number }
  /** Read-only: written back as the original node at position `from`. */
  | { kind: "locked"; text: string; from: number };

function isPlainParagraph(node: Node): boolean {
  if (node.type !== "paragraph") return false;
  return (node.children ?? []).every(
    (c) => (c.type === "text" && !c.format && !c.style) || c.type === "linebreak",
  );
}

function textOf(node: Node): string {
  if (node.type === "linebreak") return "\n";
  if (typeof node.text === "string") return node.text;
  return (node.children ?? []).map(textOf).join("");
}

export function toParagraphs(rich: RichText): Paragraph[] {
  const nodes = rich?.root?.children ?? [];
  return nodes.map((node, i) =>
    isPlainParagraph(node) ? { kind: "plain", text: textOf(node), from: i } : { kind: "locked", text: textOf(node), from: i },
  );
}

function plainParagraph(text: string): Node {
  const parts = text.split("\n");
  const children: Node[] = [];
  parts.forEach((part, i) => {
    if (i > 0) children.push({ type: "linebreak", version: 1 });
    if (part) children.push({ type: "text", text: part, format: 0, style: "", mode: "normal", detail: 0, version: 1 });
  });
  return { type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr", textStyle: "", textFormat: 0, children };
}

/**
 * Rebuilds the rich-text value from edited paragraphs. A blank line inside
 * one box splits it into separate paragraphs; empty boxes are dropped.
 * Unchanged and locked paragraphs reuse the original node exactly.
 */
export function fromParagraphs(paragraphs: Paragraph[], original: RichText): NonNullable<RichText> {
  const originals = original?.root?.children ?? [];
  const children: Node[] = [];
  for (const p of paragraphs) {
    if (p.kind === "locked") {
      if (originals[p.from]) children.push(originals[p.from]);
      continue;
    }
    const orig = p.from !== undefined ? originals[p.from] : undefined;
    if (orig && isPlainParagraph(orig) && textOf(orig) === p.text) {
      children.push(orig);
      continue;
    }
    for (const chunk of p.text.split(/\n\s*\n/)) {
      const trimmed = chunk.replace(/^\n+|\n+$/g, "");
      if (trimmed.trim()) children.push(plainParagraph(trimmed));
    }
  }
  const root = original?.root ?? { type: "root", format: "", indent: 0, version: 1, direction: "ltr", children: [] };
  return { root: { ...root, children } };
}

export function paragraphsText(paragraphs: Paragraph[]): string {
  return paragraphs.map((p) => p.text).join("\n\n");
}
