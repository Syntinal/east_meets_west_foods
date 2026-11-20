import type { Field, GlobalConfig } from "payload";
import { authenticated } from "@/access/authenticated";
import { logActivity } from "@/lib/activityLog";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { DEFAULT_BUSINESS_INFO, isValidDate, isValidPhone, isValidTime, normalizeBusinessInfo, WEEKDAYS } from "@/lib/businessInfo";
import { syncBusinessInfo } from "@/lib/businessSync";

// The restaurant's master business info: name, phone, address, regular
// hours, and holiday / one-off days. See lib/businessInfo.ts for everything
// that reads it. Edited mainly from /manage/business ("Hours, address &
// phone"); also editable here in /admin.
//
// No drafts on purpose: this is facts, not page copy, and a saved change is
// meant to go out right away — to the website, and (when connected) to
// Google and Facebook via the afterChange hook below. Where each place
// stands is kept separately in globals/BusinessSync.ts, so writing a sync
// status never re-triggers this hook.

const time = (name: string, label: string, defaultValue: string): Field => ({
  name,
  type: "text",
  label,
  defaultValue,
  admin: { width: "33%", description: '24-hour time, e.g. "12:00" or "18:30" ("24:00" = midnight).' },
  validate: (v: unknown) => (!v || isValidTime(v) ? true : 'Use 24-hour time like "18:30".'),
});

export const BusinessInfo: GlobalConfig = {
  slug: "business-info",
  label: "Hours, Address & Phone",
  access: {
    // The website reads this server-side with overrideAccess, so nothing
    // here needs to be publicly readable over the API.
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: "Site Settings",
    description:
      "The one place the restaurant's phone, address and hours live. Saving updates the website right away, and sends the change to Google and Facebook once those are connected.",
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, context }) => {
        safeRevalidatePath("/", "layout");
        if (context?.skipSync) return;
        if (!context?.skipActivity) {
          await logActivity(req.payload, { summary: "Changed the hours, address or phone", area: "other" }, req);
        }
        const before = normalizeBusinessInfo(previousDoc);
        const after = normalizeBusinessInfo(doc);
        const addressChanged = JSON.stringify(before.address) !== JSON.stringify(after.address);
        // Not awaited inside the transaction's critical path for long:
        // both pushes are a couple of quick requests each, and the sync
        // module never throws (failures are recorded as a status instead).
        await syncBusinessInfo(req.payload, after, { addressChanged });
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true, defaultValue: DEFAULT_BUSINESS_INFO.name },
    {
      name: "phone",
      type: "text",
      required: true,
      defaultValue: DEFAULT_BUSINESS_INFO.phone,
      validate: (v: unknown) => (isValidPhone(v) ? true : 'Enter all 10 digits, e.g. "(208) 627-6283".'),
    },
    {
      name: "address",
      type: "group",
      fields: [
        { name: "street", type: "text", required: true, defaultValue: DEFAULT_BUSINESS_INFO.address.street },
        { name: "suite", type: "text", label: "Suite / unit (optional)", defaultValue: DEFAULT_BUSINESS_INFO.address.suite },
        {
          type: "row",
          fields: [
            { name: "city", type: "text", required: true, defaultValue: DEFAULT_BUSINESS_INFO.address.city, admin: { width: "50%" } },
            { name: "state", type: "text", required: true, defaultValue: DEFAULT_BUSINESS_INFO.address.state, admin: { width: "20%" } },
            { name: "zip", type: "text", label: "ZIP", required: true, defaultValue: DEFAULT_BUSINESS_INFO.address.zip, admin: { width: "30%" } },
          ],
        },
      ],
    },
    {
      name: "hours",
      type: "group",
      label: "Regular weekly hours",
      fields: WEEKDAYS.map(
        (day): Field => ({
          name: day.key,
          type: "group",
          label: day.label,
          fields: [
            {
              type: "row",
              fields: [
                { name: "open", type: "checkbox", label: "Open this day", defaultValue: DEFAULT_BUSINESS_INFO.hours[day.key].open, admin: { width: "33%" } },
                time("opensAt", "Opens", DEFAULT_BUSINESS_INFO.hours[day.key].opensAt),
                time("closesAt", "Closes", DEFAULT_BUSINESS_INFO.hours[day.key].closesAt),
              ],
            },
          ],
        }),
      ),
    },
    {
      name: "specialDays",
      type: "array",
      label: "Holidays & one-off days",
      labels: { singular: "Special day", plural: "Special days" },
      admin: { description: "Days that differ from the regular hours — closed for a holiday, or open different hours." },
      fields: [
        {
          type: "row",
          fields: [
            {
              // Plain YYYY-MM-DD text, not a Payload date field: a date
              // field stores a timestamp, which can land on the wrong day
              // depending on the editor's timezone.
              name: "date",
              type: "text",
              required: true,
              admin: { width: "34%", description: "YYYY-MM-DD, e.g. 2026-11-26" },
              validate: (v: unknown) => (isValidDate(v) ? true : "Use YYYY-MM-DD, e.g. 2026-11-26."),
            },
            { name: "label", type: "text", label: "What's the day? (optional)", admin: { width: "66%", description: 'e.g. "Thanksgiving"' } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "closed", type: "checkbox", label: "Closed all day", defaultValue: true, admin: { width: "33%" } },
            time("opensAt", "Opens", "12:00"),
            time("closesAt", "Closes", "18:00"),
          ],
        },
      ],
    },
  ],
};
