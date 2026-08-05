import type { GlobalConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

// The homepage is a singleton, so it's a Global (like Navigation) rather than
// a Collection — but unlike Navigation, this one uses drafts + Live Preview,
// the same as MenuItems/News/Testimonials. It's a singleton, no per-item id
// to key a live-preview merge off of, so `initialData` can just be the whole
// fetched doc (closer to News' single-doc pattern than Menu Items').
//
// Only fields with a realistic reason for a non-technical owner to change
// them are exposed here — permanent structural labels ("Our Mission", the
// teaser card headings, etc.) stay hardcoded in components/home/HomeView.tsx
// instead of cluttering /admin.
export const Home: GlobalConfig = {
  slug: "home",
  // Shows as "Home Page" in the /admin sidebar (default would just be
  // "Home," easy to misread as a link back to the live site rather than
  // the edit screen for it). Doesn't touch the public nav — that's the
  // separate NAV_PAGES list in lib/navigation.ts, still just "Home" there.
  label: "Home Page",
  access: {
    read: readPublished,
    update: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    preview: () => getPreviewURL("/"),
    livePreview: {
      url: () => getPreviewURL("/"),
      openByDefault: true,
    },
    components: {
      // Globals shape this differently from Collections — `elements`, not
      // `edit` (confirmed via payload/dist/globals/config/types.d.ts).
      elements: {
        beforeDocumentControls: ["@/components/admin/ControlTooltips#ControlTooltips"],
      },
    },
  },
  hooks: {
    afterChange: [() => revalidatePath("/")],
  },
  fields: [
    {
      type: "group",
      name: "header",
      fields: [
        {
          name: "logoImage",
          type: "upload",
          relationTo: "media",
          admin: { description: "Transparent PNG recommended. Appears next to the site name in the header." },
        },
      ],
    },
    {
      type: "group",
      name: "hero",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          admin: {
            description:
              "Landscape orientation, at least 1600×900px recommended — this is the large banner photo at the top of the page.",
          },
        },
      ],
    },
    {
      type: "group",
      name: "mission",
      fields: [
        {
          name: "statement",
          type: "textarea",
          admin: { description: "The main mission/tagline paragraph shown near the top of the homepage." },
        },
        {
          name: "location",
          type: "text",
          admin: { description: "The short location/description line under the mission statement." },
        },
      ],
    },
    {
      type: "group",
      name: "teaserCards",
      admin: {
        description:
          'Photos and blurbs for the four preview cards on the homepage (Menu, Sauce, Story, News). Headings match the site nav and aren\'t editable here.',
      },
      fields: [
        {
          type: "group",
          name: "menu",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              admin: { description: "Landscape or square, at least 800×600px." },
            },
            { name: "body", type: "textarea", admin: { description: 'Short blurb under "Menu" on the homepage.' } },
          ],
        },
        {
          type: "group",
          name: "sauce",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              admin: { description: "Landscape or square, at least 800×600px." },
            },
            {
              name: "body",
              type: "textarea",
              admin: { description: 'Short blurb under "The Sauce" on the homepage.' },
            },
          ],
        },
        {
          type: "group",
          name: "story",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              admin: { description: "Landscape or square, at least 800×600px." },
            },
            {
              name: "body",
              type: "textarea",
              admin: { description: 'Short blurb under "Our Story" on the homepage.' },
            },
          ],
        },
        {
          type: "group",
          name: "news",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              admin: { description: "Landscape or square, at least 800×600px." },
            },
            { name: "body", type: "textarea", admin: { description: 'Short blurb under "News" on the homepage.' } },
          ],
        },
      ],
    },
    {
      type: "group",
      name: "gallery",
      fields: [
        {
          name: "photos",
          type: "array",
          admin: { description: "Add, remove, or reorder photos for the Gallery section on the homepage." },
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              required: true,
              admin: { description: "Any orientation. Shown in a grid visitors can click to enlarge." },
            },
            {
              name: "caption",
              type: "text",
              admin: {
                description: "Optional — used as this photo's accessibility description, not shown visibly on the page.",
              },
            },
          ],
        },
      ],
    },
    {
      type: "group",
      name: "seo",
      admin: { description: "SEO-focused copy near the bottom of the homepage — useful for tuning local search terms." },
      fields: [
        { name: "eyebrow", type: "text" },
        { name: "heading", type: "text" },
        {
          name: "body",
          type: "richText",
          admin: { description: "Supports links, e.g. to /menu or /contact — kept as rich text so those stay editable." },
        },
      ],
    },
  ],
};
