import type { CSSProperties } from "react";

// Flags never-published drafts with no title — the signature of an
// abandoned autosave pre-create stub. Any collection with
// `versions.drafts.autosave` on (Pages, News) silently pre-creates an
// empty draft row the moment "Create new" is opened, purely to have a
// real id for the client-side Autosave component to save against —
// required-field validation doesn't apply to that internal seed step, so
// it's created bare. If that screen gets closed before typing anything,
// the empty row is left behind with nothing to distinguish it from a real
// doc except a blank title (confirmed by inspecting one directly — see
// CLAUDE.md item 17).
//
// Purely informational — nothing is deleted automatically, on request:
// the owner didn't want a scheduled cleanup job for something this
// infrequent. Registered via `admin.components.beforeListTable`.
const boxStyle: CSSProperties = {
  border: "1px solid var(--theme-warning-500, #f5a623)",
  background: "var(--theme-warning-100, #fdf3e0)",
  borderRadius: 4,
  padding: "12px 16px",
  marginBottom: 16,
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--theme-warning-800, #6b4a00)",
};

type Doc = { id: string | number; title?: string | null; _status?: string; createdAt?: string };

export function EmptyDraftsNotice({
  data,
  collectionSlug,
}: {
  data?: { docs?: Doc[] };
  collectionSlug?: string;
}) {
  const emptyDrafts = (data?.docs ?? []).filter((doc) => doc._status === "draft" && !doc.title);
  if (emptyDrafts.length === 0 || !collectionSlug) return null;

  const plural = emptyDrafts.length > 1;

  return (
    <div style={boxStyle}>
      <strong>
        ⚠ {emptyDrafts.length} empty draft{plural ? "s" : ""} found
      </strong>
      <p style={{ margin: "4px 0 8px" }}>
        {plural ? "These have" : "This has"} no title — usually means "Create new" was opened and closed again
        before anything was typed, a normal side effect of autosave, not a bug. Safe to open and delete if you don't
        recognize {plural ? "them" : "it"}:
      </p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {emptyDrafts.map((doc) => (
          <li key={doc.id}>
            <a href={`/admin/collections/${collectionSlug}/${doc.id}`}>
              Untitled, created {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "unknown date"}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
