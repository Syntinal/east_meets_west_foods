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
    // Only ever shown on the homepage — no per-item page exists.
    afterChange: [() => revalidatePath("/")],
    afterDelete: [() => revalidatePath("/")],
  },
  admin: {
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "rating", "order", "_status"],
    preview: () => getPreviewURL("/"),
    components: {
      beforeListTable: ["@/components/admin/GoogleReviewsLink#GoogleReviewsLink"],
    },
  },
  defaultSort: "order",
  fields: [
    {
      name: "quote",
      type: "textarea",
      required: true,
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
    { name: "authorName", type: "text", required: true },
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
      admin: { description: "Optional link back to the original Google review." },
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
