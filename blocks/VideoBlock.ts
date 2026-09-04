import type { Block } from "payload";
import { videoThumbnail } from "@/lib/blockIcons";

// A standalone video, e.g. a short promo clip on a Catering or Events page.
// The media-assets collection already accepts video uploads (see
// collections/MediaAssets.ts, added for News' featuredVideo) — this just
// exposes that same capability as a self-service Page block, which had no
// video option at all before now (only Image/Gallery).
export const VideoBlock: Block = {
  slug: "video",
  labels: { singular: "Video", plural: "Video Blocks" },
  admin: { images: { thumbnail: videoThumbnail } },
  fields: [
    {
      name: "video",
      type: "upload",
      // media-assets, not media — see collections/MediaAssets.ts for why
      // video lives in a separate collection now.
      relationTo: "media-assets",
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
