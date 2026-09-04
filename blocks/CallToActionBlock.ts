import type { Block } from "payload";
import { ctaThumbnail } from "@/lib/blockIcons";
import { validateHref } from "@/lib/validateHref";

export const CallToActionBlock: Block = {
  slug: "cta",
  labels: { singular: "Call to Action", plural: "Call to Action Blocks" },
  admin: { images: { thumbnail: ctaThumbnail } },
  fields: [
    { name: "heading", type: "text", admin: { description: "Optional short heading above the button." } },
    {
      name: "body",
      type: "textarea",
      maxLength: 150,
      admin: { description: "Optional short line of text above the button — keep it to about 3 lines (150 characters max)." },
    },
    {
      name: "buttonLabel",
      type: "text",
      required: true,
      admin: { description: 'e.g. "Order Now" or "Call Us".' },
    },
    {
      name: "buttonHref",
      type: "text",
      required: true,
      label: "Button link",
      admin: {
        description:
          'Where the button goes — e.g. "/contact", "tel:+12086276283", "mailto:someone@example.com", or a full https:// link.',
      },
      validate: validateHref,
    },
  ],
};
