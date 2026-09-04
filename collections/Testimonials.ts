import type { CollectionConfig, TextFieldSingleValidation } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// Hand-curated: the owner reads reviews on Google himself (the list view
// has a link straight to the Maps listing) and copies the ones he wants
// into a new entry here. Deliberately not synced via the Places API — see
// components/admin/GoogleReviewsLink.tsx for why.
export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    // Shown on both the homepage carousel and the dedicated /testimonials page.
    afterChange: [() => revalidatePath("/"), () => revalidatePath("/testimonials")],
    afterDelete: [() => revalidatePath("/"), () => revalidatePath("/testimonials")],
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping, not just leaves it ungrouped — see
    // node_modules/@payloadcms/ui/dist/utilities/groupNavItems.js. Already
    // listed, in the correct site-page order, by SitePagesNav
    // (admin.components.beforeNavLinks in payload.config.ts) — a second
    // "Site Content" copy here was redundant and confusingly out of order.
    group: false,
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "rating", "order", "_status"],
    preview: () => getPreviewURL("/testimonials"),
    livePreview: {
      // Payload's live-preview merge does a real API round-trip scoped to
      // `initialData.id` on every keystroke — the frontend needs to know
      // which testimonial is actually being edited to seed that correctly.
      // This travels as a cookie (set by /next/preview), not a query string —
      // see getPreviewURL for why.
      url: ({ data }) => getPreviewURL("/testimonials", data?.id ? String(data.id) : undefined),
      openByDefault: true,
    },
    components: {
      // Replaces the whole List view with a split list+live-preview screen
      // — see components/admin/ListPreviewView.tsx, which also renders
      // GoogleReviewsLink above the list (previously a beforeListTable
      // entry here) so that feature isn't lost in the replacement.
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
      name: "quote",
      type: "textarea",
      required: true,
      admin: { description: "The review text, copied in from Google Reviews." },
      // Catches accidentally pasting the same review in twice — compares
      // case/whitespace-insensitively since a re-copy from Google rarely
      // matches byte-for-byte.
      validate: async (value, { req, id }) => {
        if (!value) return true;
        const normalized = value.trim().toLowerCase();
        const existing = await req.payload.find({
          collection: "testimonials",
          where: id ? { id: { not_equals: id } } : {},
          limit: 0,
          pagination: false,
          overrideAccess: true,
        });
        const isDuplicate = existing.docs.some(
          (doc) => typeof doc.quote === "string" && doc.quote.trim().toLowerCase() === normalized
        );
        return isDuplicate ? "This exact testimonial already exists — check the list before adding it again." : true;
      },
    },
    {
      name: "authorName",
      type: "text",
      required: true,
      admin: { description: 'Name shown under the quote (e.g. "Jane D.").' },
    },
    {
      name: "rating",
      type: "select",
      required: true,
      defaultValue: "5",
      admin: { description: "Displayed as stars. Only feature 4-5 star reviews." },
      options: [
        { label: "★★★★★ (5)", value: "5" },
        { label: "★★★★ (4)", value: "4" },
        { label: "★★★ (3)", value: "3" },
      ],
    },
    {
      name: "sourceUrl",
      type: "text",
      label: "Source URL",
      admin: { description: "Optional. A link back to the original Google review." },
      // Same idea as the quote check, but only when a URL is actually set —
      // this field is optional.
      validate: (async (value, { req, id }) => {
        if (!value) return true;
        const trimmed = value.trim();
        const existing = await req.payload.find({
          collection: "testimonials",
          where: id ? { id: { not_equals: id } } : {},
          limit: 0,
          pagination: false,
          overrideAccess: true,
        });
        const isDuplicate = existing.docs.some(
          (doc) => typeof doc.sourceUrl === "string" && doc.sourceUrl.trim() === trimmed
        );
        return isDuplicate ? "This source URL is already used by another testimonial." : true;
      }) as TextFieldSingleValidation,
    },
    { name: "order", type: "number", defaultValue: 0, admin: { description: "Lower numbers show first." } },
  ],
};
