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
      // Was a "Full width" checkbox — its own admin.description already
      // promised "edge-to-edge," but the CSS behind it (.page-block-image--full)
      // only ever stretched to 100% of the page's content column (max
      // 1180px, itself inset from the browser edge — see .container in
      // app/(frontend)/globals.css), never the actual screen edge. That's
      // why it looked like it "didn't do much": on a normal-size photo
      // that's already close to the content column's width, 100%-of-a-
      // similar-width-container is a small change. Fixed by (a) making
      // "Full Bleed" a real edge-of-screen-to-edge-of-screen break-out
      // (see .page-block-image--full below) and (b) turning this into a
      // 3-option size picker instead of a binary checkbox, since "can I
      // adjust the photo size" was a separate, real gap — there was
      // previously no way to get anything between "natural size" and
      // "stretch to fill." Confirmed zero real Pages data used the old
      // `fullBleed` field before renaming it (see git history), so this
      // was a safe direct field replacement, not a two-pass migration.
      name: "size",
      type: "select",
      defaultValue: "normal",
      label: "Photo size",
      options: [
        { label: "Normal — fits the page's text width", value: "normal" },
        { label: "Large — fills the page's content area", value: "large" },
        { label: "Full Bleed — stretches to the edges of the screen", value: "full" },
      ],
      admin: {
        description:
          'Normal keeps the photo the same width as the page\'s paragraphs. Large fills the wider content area around it (still has margin on very wide screens). Full Bleed goes all the way to the edges of the browser window, with no margin at all.',
      },
    },
  ],
};
