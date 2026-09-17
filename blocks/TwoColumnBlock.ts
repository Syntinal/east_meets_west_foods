import type { Block } from "payload";
import { twoColumnThumbnail } from "@/lib/blockIcons";

export const TwoColumnBlock: Block = {
  slug: "twoColumn",
  // "Block.admin" doesn't support a `description` (caught by next build's
  // type check, not next dev) — the block's `labels.singular` is what
  // shows in the admin's "add block" picker instead. It does support
  // `images.thumbnail` though (see lib/blockIcons.ts).
  labels: { singular: "Two Column (side-by-side photo + text)", plural: "Two Column Blocks" },
  admin: { images: { thumbnail: twoColumnThumbnail } },
  fields: [
    {
      type: "group",
      name: "left",
      label: "Left column",
      fields: [
        { name: "image", type: "upload", relationTo: "media", filterOptions: { mimeType: { contains: "image" } } },
        {
          name: "video",
          type: "upload",
          // media-assets, not media — see collections/MediaAssets.ts for
          // why video lives in a separate collection now. Takes priority
          // over the photo above when both are set, same "video wins"
          // rule News' featuredImage/featuredVideo pair uses.
          relationTo: "media-assets",
          filterOptions: { mimeType: { contains: "video" } },
          admin: { description: "Optional. Shown instead of the photo above if set." },
        },
        { name: "content", type: "richText" },
      ],
    },
    {
      type: "group",
      name: "right",
      label: "Right column",
      fields: [
        { name: "image", type: "upload", relationTo: "media", filterOptions: { mimeType: { contains: "image" } } },
        {
          name: "video",
          type: "upload",
          relationTo: "media-assets",
          filterOptions: { mimeType: { contains: "video" } },
          admin: { description: "Optional. Shown instead of the photo above if set." },
        },
        { name: "content", type: "richText" },
      ],
    },
  ],
};
