import type { Block } from "payload";

// The restaurant's hours, drawn automatically from the business info
// record (globals/BusinessInfo.ts — "Hours, address & phone" in /manage).
// Nothing to type here: change the hours there and this table, Google and
// Facebook all follow. Uses the same table styling as hours typed into a
// Rich Text block (components/pages/RichTextWithHours.tsx).
export const StoreHoursBlock: Block = {
  slug: "storeHours",
  labels: { singular: "Store Hours (automatic)", plural: "Store Hours Blocks" },
  fields: [
    {
      name: "showSpecialDays",
      type: "checkbox",
      label: "Also list upcoming holidays and special days",
      defaultValue: true,
    },
  ],
};
