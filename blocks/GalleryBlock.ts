import type { Block } from "payload";
import { galleryThumbnail } from "@/lib/blockIcons";

// Same shape as the Home global's photo gallery group (see globals/Home.ts)
// — reused here so components/home/GalleryGrid.tsx can render either one.
export const GalleryBlock: Block = {
  slug: "gallery",
  labels: { singular: "Photo Gallery", plural: "Photo Gallery Blocks" },
  admin: { images: { thumbnail: galleryThumbnail } },
  fields: [
    {
      name: "photos",
      type: "array",
      minRows: 1,
      admin: { description: "Add, remove, or reorder photos. Shown in a grid visitors can click to enlarge." },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
          filterOptions: { mimeType: { contains: "image" } },
        },
        {
          name: "caption",
          type: "text",
          admin: { description: "Optional — used as this photo's accessibility description, not shown visibly on the page." },
        },
      ],
    },
  ],
};
