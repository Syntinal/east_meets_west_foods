import { RichText } from "@/components/StyledRichText";

// Renders a Pages "Rich Text" block, but lays out store hours as a real
// two-column table when the owner has typed them as one-per-line paragraphs
// ("Monday: 12pm – 6pm", "Tuesday: Closed", ...). The owner keeps typing
// plain lines in /admin or /manage — nothing about the stored content
// changes, this is purely how it's drawn on the page.
//
// Only kicks in for a run of 3+ consecutive day lines, so an ordinary
// sentence that happens to start with "Monday:" is left alone. A "Note:"
// paragraph is only turned into a boxed callout inside a block that has an
// hours table, so "Note:" text on other pages renders exactly as before.

type LexNode = { type?: string; text?: string; children?: LexNode[]; [k: string]: unknown };
type LexRoot = { root: LexNode & { children: LexNode[] } };

type Segment =
  | { kind: "rich"; nodes: LexNode[] }
  | { kind: "hours"; rows: { day: string; hours: string }[] }
  | { kind: "note"; text: string }
  | { kind: "plain"; text: string; role: "heading" | "text" | "signoff" };

const DAY_LINE = /^\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s*[:\-–—]\s*(.+?)\s*$/i;
const NOTE_LINE = /^[\s*]*note\s*[:\-–—]\s*/i;
const MIN_DAY_ROWS = 3;

// Plain text of a paragraph, or null if it holds anything other than plain
// text/line breaks (a link, an image...) — those are never reformatted.
function plainParagraphText(node: LexNode): string | null {
  if (node.type !== "paragraph" || !Array.isArray(node.children)) return null;
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.text ?? "";
    else if (child.type === "linebreak") out += " ";
    else return null;
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function segment(children: LexNode[]): Segment[] {
  const segments: Segment[] = [];
  const pushRich = (node: LexNode) => {
    const last = segments[segments.length - 1];
    if (last?.kind === "rich") last.nodes.push(node);
    else segments.push({ kind: "rich", nodes: [node] });
  };

  let i = 0;
  while (i < children.length) {
    const rows: { day: string; hours: string }[] = [];
    let j = i;
    while (j < children.length) {
      const m = plainParagraphText(children[j])?.match(DAY_LINE);
      if (!m) break;
      rows.push({ day: capitalize(m[1]), hours: m[2] });
      j++;
    }
    if (rows.length >= MIN_DAY_ROWS) {
      segments.push({ kind: "hours", rows });
      i = j;
    } else {
      pushRich(children[i]);
      i++;
    }
  }

  if (!segments.some((s) => s.kind === "hours")) return segments;

  // Second pass, only for blocks that actually have an hours table. Plain
  // lines get the same clean look as the mock-up, whatever bold/underline
  // the owner typed them with: "Note:" lines become a callout, the line
  // just before the table a small heading, anything else (e.g. the
  // sign-off) plain text. Blank lines are dropped. Lines holding a link or
  // anything else non-plain still render as normal rich text.
  const out: Segment[] = [];
  for (let si = 0; si < segments.length; si++) {
    const s = segments[si];
    if (s.kind !== "rich") {
      out.push(s);
      continue;
    }
    const beforeTable = segments[si + 1]?.kind === "hours";
    let buf: LexNode[] = [];
    const flush = () => {
      if (buf.length) out.push({ kind: "rich", nodes: buf });
      buf = [];
    };
    s.nodes.forEach((node, ni) => {
      const raw = plainParagraphText(node);
      if (raw === null) {
        buf.push(node);
        return;
      }
      const text = raw.trim();
      if (!text) return;
      flush();
      if (NOTE_LINE.test(text)) out.push({ kind: "note", text: text.replace(NOTE_LINE, "").trim() });
      else if (beforeTable && ni === s.nodes.length - 1) out.push({ kind: "plain", text, role: "heading" });
      else out.push({ kind: "plain", text, role: "text" });
    });
    flush();
  }
  // The block's last line, if it's plain text after the table, is the
  // sign-off ("High Regards…Roger and Selena").
  const last = out[out.length - 1];
  if (last?.kind === "plain" && last.role === "text") last.role = "signoff";
  return out;
}

// "Winter Season Store Hours (beginning 11/11/26)" → title + subtitle.
function splitHeading(text: string): { title: string; sub: string | null } {
  const m = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m || !m[1]) return { title: text, sub: null };
  return { title: m[1], sub: m[2].charAt(0).toUpperCase() + m[2].slice(1) };
}

// "High Regards…Roger and Selena" → closing + names. Splits on the first
// ellipsis, comma or dash; anything else stays one line.
function splitSignoff(text: string): { closing: string | null; names: string } {
  const m = text.match(/^(.+?)\s*(?:…|\.{2,}|,|\s[-–—]\s)\s*(.+)$/);
  if (!m) return { closing: null, names: text };
  return { closing: m[1], names: m[2].replace(/\s+and\s+/i, " & ") };
}

function NoteIcon() {
  return (
    <svg className="hours-note-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function RichTextWithHours({ data }: { data: unknown }) {
  const root = (data as LexRoot | null)?.root;
  if (!root || !Array.isArray(root.children)) return <RichText data={data as never} />;

  const segments = segment(root.children);
  if (!segments.some((s) => s.kind === "hours")) return <RichText data={data as never} />;

  return (
    <>
      {segments.map((s, i) => {
        if (s.kind === "rich") {
          return <RichText key={i} data={{ root: { ...root, children: s.nodes } } as never} />;
        }
        if (s.kind === "hours") {
          return (
            <table key={i} className="hours-table">
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.day} className={/^closed$/i.test(r.hours) ? "is-closed" : undefined}>
                    <th scope="row">{r.day}</th>
                    <td>{r.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (s.kind === "plain") {
          if (s.role === "heading") {
            const { title, sub } = splitHeading(s.text);
            return (
              <div key={i} className="hours-heading">
                <h2 className="hours-heading-title">{title}</h2>
                {sub ? <p className="hours-heading-sub">{sub}</p> : null}
              </div>
            );
          }
          if (s.role === "signoff") {
            const { closing, names } = splitSignoff(s.text);
            return (
              <p key={i} className="hours-signoff">
                {closing ? <span className="hours-signoff-closing">{closing},</span> : null}
                <span className="hours-signoff-names">{names}</span>
              </p>
            );
          }
          return (
            <p key={i} className="hours-text">
              {s.text}
            </p>
          );
        }
        return (
          <p key={i} className="hours-note">
            <NoteIcon />
            <span>
              <strong>NOTE:</strong> {s.text}
            </span>
          </p>
        );
      })}
    </>
  );
}
