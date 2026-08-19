import type { Block } from "payload";
import { videoThumbnail } from "@/lib/blockIcons";

// A standalone video, e.g. a short promo clip on a Catering or Events page.
// Media already accepts video uploads (see collections/Media.ts, added for
// News' featuredVideo) — this just exposes that same capability as a
// self-service Page block, which had no video option at all before now
// (only Image/Gallery).
export const VideoBlock: Block = {
  slug: "video",
  labels: { singular: "Video", plural: "Video Blocks" },
  admin: { images: { thumbnail: videoThumbnail } },
  fields: [
    {
      name: "video",
      type: "upload",
      relationTo: "media",
      required: true,
      filterOptions: { mimeType: { contains: "video" } },
      admin: { description: "The video file." },
    },
    {
      name: "caption",
      type: "text",
      admin: { description: "Optional. Shown as a small caption under the video." },
    },
  ],
};
