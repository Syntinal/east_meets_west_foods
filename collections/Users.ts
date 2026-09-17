import type { CollectionConfig } from "payload";

// A real, read-only check this session (payload.find({collection: "users"}))
// found 3 real accounts with active login sessions, not the single owner
// login this collection's own comment used to assume — see CLAUDE.md.
// `role` is the first actual distinction between them: "Master Admin" can
// manage other people's enrolled reminder devices
// (collections/PushSubscriptions.ts); a plain "Admin" can still do
// everything else, including enabling/disabling reminders on their own
// device — this only gates managing *other* people's.
//
// Defaults every account to "admin" (least privilege) rather than
// guessing who should be "master" — promote the right account(s) by hand
// in /admin → Users once this ships.
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    group: "Site Settings",
    useAsTitle: "email",
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "admin",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Master Admin", value: "master" },
      ],
      admin: {
        description:
          "Master Admin can see and remove enrolled reminder devices for anyone (Site Settings → Push Subscriptions). Plain Admin can do everything else, including enabling reminders on their own device — this only affects managing other people's.",
      },
    },
  ],
};
