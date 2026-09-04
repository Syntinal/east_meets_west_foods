import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The eyebrow + heading above the testimonial grid on /testimonials —
// previously hardcoded in app/(frontend)/testimonials/page.tsx. Same
// singleton-Global + drafts + Live Preview shape as globals/MenuIntro.ts.
// Individual Testimonials stay a Collection (collections/Testimonials.ts)
// with their own Live Preview session — this is a deliberately separate
// doc/session, mirroring Menu Items vs. Menu Intro (only one
// useLivePreview subscription should be active per preview session, see
// the /next/preview route's comment for why).
export const TestimonialsIntro: GlobalConfig = {
  slug: "testimonials-intro",
  // Shows as "Testimonials Intro" in the /admin sidebar — distinct from
  // the "Testimonials" label already used by the Testimonials collection.
  label: "Testimonials Intro",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    // false (not a string label) skips this entirely from the sidebar's
    // Collections/Globals grouping — see globals/Home.ts's comment for the
    // fuller explanation. Doesn't get its own Site Pages row either
    // (mirrors globals/MenuIntro.ts) — reached instead via an edit-link
    // notice at the top of the Testimonials list view
    // (components/admin/EditTestimonialsIntroLink.tsx).
    group: false,
    preview: () => getPreviewURL("/testimonials"),
    livePreview: {
      url: () => getPreviewURL("/testimonials"),
      openByDefault: true,
    },
    components: {
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/testimonials")],
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      defaultValue: "What People Are Saying",
      admin: { description: "Small label above the heading." },
    },
    {
      name: "heading",
      type: "text",
      defaultValue: "Testimonials",
      admin: { description: "Headline shown above the testimonial grid." },
    },
  ],
};
