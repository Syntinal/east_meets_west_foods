import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { readPublished } from "@/access/readPublished";
import { getPreviewURL } from "@/lib/preview";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const News: CollectionConfig = {
  slug: "news-posts",
  access: {
    read: readPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: true,
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "publishedDate", "_status"],
    preview: (doc) => getPreviewURL(`/news/${doc?.slug ?? ""}`),
    livePreview: {
      url: ({ data }) => getPreviewURL(`/news/${data?.slug ?? ""}`),
      openByDefault: true,
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc }) => {
        revalidatePath("/news");
        if (doc?.slug) revalidatePath(`/news/${doc.slug}`);
        revalidatePath("/");
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidatePath("/news");
        if (doc?.slug) revalidatePath(`/news/${doc.slug}`);
        revalidatePath("/");
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "The headline shown on the News page and at the top of the post." },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
        description: "Powers the post's URL (/news/your-slug). Auto-filled from the title if left blank.",
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "post",
      admin: {
        position: "sidebar",
        description: '"Post" is a regular news article. "Announcement" is a short notice that can optionally show as a banner on the homepage.',
      },
      options: [
        { label: "Post", value: "post" },
        { label: "Announcement", value: "announcement" },
      ],
    },
    {
      name: "showAsHomepageBanner",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Feature this as the banner on the homepage. Checking it here replaces whichever announcement was featured before.",
        condition: (_, siblingData) => siblingData.type === "announcement",
      },
    },
    {
      name: "bannerEndDate",
      type: "date",
      admin: {
        position: "sidebar",
        description:
          "Optional. The homepage banner stops showing itself on this date (e.g. when a sale ends) — no need to come back and uncheck it manually. The site rechecks roughly hourly, so removal isn't second-precise.",
        condition: (_, siblingData) => siblingData.type === "announcement" && siblingData.showAsHomepageBanner,
        date: { pickerAppearance: "dayOnly" },
      },
    },
    {
      name: "publishedDate",
      type: "date",
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        description: "The date shown on the post. Defaults to today.",
      },
    },
    { name: "excerpt", type: "textarea", admin: { description: "Short summary shown on the News list and used as the page description for search engines." } },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Optional. Image shown at the top of the post and in the News list." },
    },
    {
      name: "body",
      type: "richText",
      required: true,
      admin: { description: "The full content of the post." },
    },
  ],
};
