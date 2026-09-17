// Extracts plain text from a Lexical rich-text field's serialized editor
// state — used to build FAQ's JSON-LD `text` from the same richText answer
// field that renders the visible page (see globals/Faq.ts and
// app/(frontend)/faq/page.tsx), so there's one source of truth instead of
// two independently hand-typed copies. Walks the node tree collecting
// `text` leaves; unknown/future node types are silently skipped rather
// than thrown on, since this only feeds SEO metadata, not the visible page.
type LexicalNode = { text?: string; children?: LexicalNode[]; [key: string]: unknown };

function collectText(node: LexicalNode | undefined, parts: string[]): void {
  if (!node) return;
  if (typeof node.text === "string") parts.push(node.text);
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectText(child, parts);
  }
}

export function richTextToPlainText(value: unknown): string {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root;
  if (!root) return "";
  const parts: string[] = [];
  collectText(root, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
