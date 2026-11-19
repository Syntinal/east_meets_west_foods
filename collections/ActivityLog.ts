import type { CollectionConfig } from "payload";
import { authenticated } from "@/access/authenticated";

// Plain-English history of what happened on the site, shown on /manage's
// "Recent activity" screen (and read-only here in /admin). Written only by
// server code — lib/activityLog.ts, called from the collections'/globals'
// own hooks (so /admin changes are recorded too) and from /manage's
// operations for failures. Nobody can create, edit, or delete entries
// through the API; the history can't be quietly rewritten.
export const ActivityLog: CollectionConfig = {
  slug: "activity-log",
  labels: { singular: "Activity", plural: "Recent activity" },
  admin: {
    group: "Site Settings",
    useAsTitle: "summary",
    defaultColumns: ["createdAt", "summary", "status", "who"],
    description: "What's been posted and changed, newest first. Written automatically.",
  },
  defaultSort: "-createdAt",
  access: {
    read: authenticated,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "summary", type: "text", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "success",
      options: [
        { label: "Worked", value: "success" },
        { label: "Failed", value: "failed" },
        { label: "Not sure yet", value: "unknown" },
      ],
    },
    {
      name: "area",
      type: "select",
      options: [
        { label: "Menu", value: "menu" },
        { label: "Website page", value: "page" },
        { label: "Post", value: "post" },
        { label: "Review", value: "review" },
        { label: "Photo or video", value: "photo" },
        { label: "Other", value: "other" },
      ],
    },
    // Email of whoever did it, or empty for automatic jobs.
    { name: "who", type: "text" },
  ],
};
