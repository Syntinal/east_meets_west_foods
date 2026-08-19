import type { Block } from "payload";
import { imageThumbnail } from "@/lib/blockIcons";

export const ImageBlock: Block = {
  slug: "image",
  labels: { singular: "Image", plural: "Image Blocks" },
  admin: { images: { thumbnail: imageThumbnail } },
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
      admin: { description: "Optional. Shown as a small caption under the photo." },
    },
    {
      name: "fullBleed",
      type: "checkbox",
      defaultValue: false,
      label: "Full width",
      admin: { description: "Stretch the photo edge-to-edge instead of keeping it inside the page's normal text width." },
    },
  ],
};
