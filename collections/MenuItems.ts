import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activityLog";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// Matches the current /menu page structure: 3 "main" cards (photo + description
// + tiered pricing) and 3 "extras" cards (flat pricing, no photo/description).
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  // Plural shows as "Menu" in the /admin sidebar, matching the site's own
  // nav label (lib/navigation.ts) instead of the default "Menu Items".
  labels: {
    singular: "Menu Item",
    plural: "Menu",
  },
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: true,
  },
  // Removing an item soft-deletes it (sets deletedAt) so /manage's
  // "Recently Removed" can bring it back. Trashed docs are excluded from
  // every normal find() automatically.
  trash: true,
  hooks: {
    // Moving an item to the trash is a plain update ({ deletedAt }), and a
    // plain update merges onto the item's LATEST version — if that's a
    // saved-but-unpublished edit, it gets pulled into the live row (the
    // Bao Buns incident, CLAUDE.md item 27): the item comes back from the
    // trash with the unfinished edit and off the website. Confirmed on the
    // local test DB. Fix: when trashing, write the item's current LIVE
    // content alongside deletedAt. Covers both /manage and /admin's own
    // trash button. The unfinished edit stays in version history.
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation !== "update" || !data?.deletedAt || !originalDoc?.id) return data;
        const live = (await req.payload.findByID({
          collection: "menu-items",
          id: originalDoc.id,
          draft: false,
          trash: true,
          depth: 0,
          req,
          overrideAccess: true,
        })) as unknown as Record<string, unknown>;
        const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...liveData } = live;
        return { ...data, ...liveData, deletedAt: data.deletedAt };
      },
    ],
    // /menu is statically cached — bust it the moment an edit is saved,
    // instead of rendering fresh on every visitor request.
    afterChange: [
      () => revalidatePath("/menu"),
      // "Recent activity" — written in the same transaction as the change
      // (see lib/activityLog.ts). `context.activity` lets callers like
      // /manage's Undo describe what actually happened.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (context?.skipActivity) return;
        const name = `“${doc.title}”`;
        const summary =
          typeof context?.activity === "string"
            ? context.activity
            : doc.deletedAt && !previousDoc?.deletedAt
              ? `Removed ${name} from the menu`
              : !doc.deletedAt && previousDoc?.deletedAt
                ? `Brought ${name} back to the menu`
                : operation === "create"
                  ? `Added ${name} to the menu${doc._status === "published" ? "" : " (not on the website yet)"}`
                  : doc._status === "published"
                    ? `Put menu changes on the website: ${name}`
                    : `Saved changes to ${name} (not on the website yet)`;
        await logActivity(req.payload, { summary, area: "menu" }, req);
      },
    ],
    afterDelete: [() => revalidatePath("/menu")],
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    useAsTitle: "title",
    defaultColumns: ["title", "group", "order", "_status"],
    // No per-item page exists — preview always shows the whole menu page
    // with this item's draft change applied.
    preview: () => getPreviewURL("/menu"),
    livePreview: {
      // Payload's live-preview merge does a real API round-trip scoped to
      // `initialData.id` on every keystroke (to resolve the `image` relation) —
      // the frontend needs to know which item is actually being edited to seed
      // that correctly. This travels as a cookie (set by /next/preview), not a
      // query string — see getPreviewURL for why.
      url: ({ data }) => getPreviewURL("/menu", data?.id ? String(data.id) : undefined),
      openByDefault: true,
    },
    components: {
      // Replaces the whole List view with a split list+live-preview screen
      // — see components/admin/ListPreviewView.tsx for why (no single doc
      // to attach Payload's own Edit-view preview split to).
      views: {
        list: {
          Component: "@/components/admin/ListPreviewView#ListPreviewView",
        },
      },
      edit: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  defaultSort: "order",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "Name of the dish as it appears on the menu." },
    },
    {
      name: "group",
      type: "select",
      required: true,
      admin: { description: '"Main" gets a photo, description, and tag. "Extras" is just a name and pricing.' },
      options: [
        { label: "Main", value: "main" },
        { label: "Extras", value: "extras" },
      ],
    },
    {
      name: "tag",
      type: "text",
      admin: {
        description: 'e.g. "Northern Chinese", "Best of Both"',
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description: "Short description shown under the dish name on the menu page.",
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "image" } },
      admin: {
        description: "Photo shown next to this dish on the menu page.",
        condition: (_, siblingData) => siblingData.group === "main",
      },
    },
    {
      name: "priceOptions",
      type: "array",
      label: "Prices",
      required: true,
      minRows: 1,
      admin: {
        description: 'One row per size/price (e.g. "Small – $8.99"). At least one is required — click "Add Prices" below to add another.',
      },
      fields: [
        { name: "label", type: "text", required: true, admin: { description: 'e.g. "Small", "Large", "Whole"' } },
        { name: "price", type: "text", required: true, admin: { description: 'e.g. "$8.99"' } },
        { name: "note", type: "text", admin: { description: 'Optional. e.g. "per lb"' } },
      ],
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { description: "Controls the order dishes appear in on the menu page. Lower numbers show first." },
    },
  ],
};
