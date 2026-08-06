import { getPreviewURL } from "@/lib/preview";
import { GoogleReviewsLink } from "./GoogleReviewsLink";
import { ListPreviewSplit, type PreviewItem } from "./ListPreviewSplit";

type Doc = {
  id: string | number;
  slug?: string;
  title?: string;
  authorName?: string;
  publishedDate?: string;
  excerpt?: string;
  body?: unknown;
  _status?: string;
  type?: string;
  showAsHomepageBanner?: boolean;
};

type ListConfig = {
  label: string;
  createLabel: string;
  defaultPath: string;
  // Mirrors each collection's own existing `admin.livePreview.url` function
  // (see collections/MenuItems.ts / News.ts / Testimonials.ts) — Menu/
  // Testimonials share one page across all items so need a livePreviewId
  // to disambiguate which one; News posts each have their own /news/<slug>
  // route so don't.
  itemPreviewUrl: (doc: Doc) => string;
  itemLabel: (doc: Doc) => string;
  // Restores the Post/Announcement distinction the old table's "type"
  // column showed (News's `defaultColumns` includes "type") — lost when
  // this view replaced that table entirely. Optional since only News has
  // this field.
  itemBadge?: (doc: Doc) => string | undefined;
};

const CONFIG: Record<string, ListConfig> = {
  "menu-items": {
    label: "Menu",
    createLabel: "Menu Item",
    defaultPath: "/menu",
    itemPreviewUrl: (doc) => getPreviewURL("/menu", String(doc.id)),
    itemLabel: (doc) => doc.title || "Untitled",
  },
  "news-posts": {
    label: "News",
    createLabel: "News Post",
    defaultPath: "/news",
    itemPreviewUrl: (doc) => getPreviewURL(`/news/${doc.slug ?? ""}`),
    // News has autosave on, which silently pre-creates an empty draft row
    // the moment "Create new" is opened — if that screen is abandoned
    // before typing anything, the row is left behind with no title. A
    // never-published doc with no title AND no slug/body/excerpt either is
    // that exact pattern, not a real post that just needs a title — label
    // it as such so it doesn't get mistaken for one. See
    // components/admin/EmptyDraftsNotice.tsx (same signal, used for Pages).
    itemLabel: (doc) => {
      if (doc.title) return doc.title;
      const looksAbandoned = doc._status === "draft" && !doc.slug && !doc.body && !doc.excerpt;
      return looksAbandoned ? "(Empty draft — safe to delete)" : "Untitled";
    },
    itemBadge: (doc) => {
      const base = doc.type === "announcement" ? "Announcement" : "Post";
      return doc.showAsHomepageBanner ? `${base} · Homepage banner` : base;
    },
  },
  testimonials: {
    label: "Testimonials",
    createLabel: "Testimonial",
    defaultPath: "/testimonials",
    itemPreviewUrl: (doc) => getPreviewURL("/testimonials", String(doc.id)),
    itemLabel: (doc) => doc.authorName || "Untitled",
  },
};

// Replaces the default admin List view for Menu Items, News, and
// Testimonials — collections that render as a list onto one shared site
// page, so (unlike Home/Sauce/Story/FAQ/Contact, which each get a single
// doc and Payload's own Edit view's left-form/right-live-preview split for
// free) there was previously no page preview available before opening a
// specific item. Registered via `admin.components.views.list.Component`
// (see e.g. collections/MenuItems.ts) — this fully replaces what renders
// at /admin/collections/<slug> itself; Payload still does the underlying
// `payload.find()` server-side and hands the result in as `data` before
// this ever renders, so no separate fetch is needed here.
//
// getPreviewURL() reads process.env.PREVIEW_SECRET and must stay
// server-only, so every item's preview URL (secret already baked in, same
// as the existing per-item Preview button ships today) is precomputed
// here and handed to the client half as plain strings — see
// ListPreviewSplit.tsx, which never calls getPreviewURL itself.
export function ListPreviewView(props: {
  collectionSlug?: string;
  data?: { docs?: Doc[] };
  newDocumentURL?: string;
}) {
  const { collectionSlug, data, newDocumentURL } = props;
  const config = collectionSlug ? CONFIG[collectionSlug] : undefined;

  if (!config || !collectionSlug) {
    // Shouldn't happen — this is only ever registered on the 3 collections
    // in CONFIG above — but fail into something rather than crash the
    // admin panel if it ever is.
    return <p>Unknown collection.</p>;
  }

  let docs = data?.docs ?? [];
  if (collectionSlug === "news-posts") {
    // Payload's list view has no defaultSort configured for News (unlike
    // Menu Items/Testimonials, which sort by their own `order` field) —
    // re-sort to match /news's own listing order (newest first) instead of
    // whatever Payload's unconfigured default happens to be.
    docs = [...docs].sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));
  }

  const items: PreviewItem[] = docs.map((doc) => ({
    id: String(doc.id),
    label: config.itemLabel(doc),
    badge: config.itemBadge?.(doc),
    previewUrl: config.itemPreviewUrl(doc),
    editHref: `/admin/collections/${collectionSlug}/${doc.id}`,
  }));

  return (
    <div style={{ padding: "0 var(--gutter-h, 24px)" }}>
      <h1 style={{ marginBottom: 16 }}>{config.label}</h1>
      {collectionSlug === "testimonials" && <GoogleReviewsLink />}
      <ListPreviewSplit
        items={items}
        defaultPreviewUrl={getPreviewURL(config.defaultPath)}
        createHref={newDocumentURL ?? `/admin/collections/${collectionSlug}/create`}
        createLabel={config.createLabel}
      />
    </div>
  );
}
