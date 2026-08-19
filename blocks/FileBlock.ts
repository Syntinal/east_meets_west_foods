import type { Block } from "payload";
import { fileThumbnail } from "@/lib/blockIcons";

// A downloadable file (PDF) — a catering menu, an event flyer, a printable
// order form. Needed collections/Media.ts to accept `application/pdf`
// first (previously image/video only, see that file's own comment); the
// filterOptions below scope the "choose from existing" picker to PDFs
// specifically so this field doesn't also offer every photo/video in the
// library, same pattern as every other upload field's `contains` filter.
export const FileBlock: Block = {
  slug: "file",
  labels: { singular: "File Download", plural: "File Download Blocks" },
  admin: { images: { thumbnail: fileThumbnail } },
  fields: [
    {
      name: "file",
      type: "upload",
      relationTo: "media",
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
