import type { Block } from "payload";
import { richTextThumbnail } from "@/lib/blockIcons";

export const RichTextBlock: Block = {
  slug: "richText",
  labels: { singular: "Rich Text", plural: "Rich Text Blocks" },
  admin: { images: { thumbnail: richTextThumbnail } },
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
    },
  ],
};
