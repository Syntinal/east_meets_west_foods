import type { Block } from "payload";
import { fileThumbnail } from "@/lib/blockIcons";

// A downloadable file (PDF) — a catering menu, an event flyer, a printable
// order form. Lives in collections/MediaAssets.ts (video/PDF), not
// collections/Media.ts (images only) — see that file's own comment; the
// filterOptions below scope the "choose from existing" picker to PDFs
// specifically so this field doesn't also offer every video in that same
// library, same pattern as every other upload field's `contains` filter.
export const FileBlock: Block = {
  slug: "file",
  labels: { singular: "File Download", plural: "File Download Blocks" },
  admin: { images: { thumbnail: fileThumbnail } },
  fields: [
    {
      name: "file",
      type: "upload",
      // media-assets, not media — see collections/MediaAssets.ts for why
      // PDFs live in a separate collection now.
      relationTo: "media-assets",
      required: true,
      filterOptions: { mimeType: { contains: "pdf" } },
      admin: { description: "The PDF visitors will download." },
    },
    {
      name: "label",
      type: "text",
      required: true,
      admin: { description: 'The button text — e.g. "Download the Catering Menu (PDF)".' },
    },
  ],
};
