import type { CollectionConfig } from "payload";
import { masterAdmin } from "@/access/masterAdmin";

// One row per device that's tapped "Enable reminders" (see
// components/admin/PushReminderButton.tsx) — the Web Push subscription
// object the browser hands back on `pushManager.subscribe()`. Written only
// via app/(payload)/api/push/subscribe/route.ts (an authenticated route
// using the Local API with overrideAccess: true, same pattern as
// app/(payload)/api/reorder/route.ts) — the collection's own access rules
// below are the real gate for anyone hitting the REST/GraphQL API directly
// or browsing this list in /admin, not for that route itself. That's what
// makes it safe to lock this whole collection to Master Admin only:
// enabling/disabling/testing reminders on your OWN device never touches
// this collection's access rules at all (the button's live/subscribed
// status comes purely from the browser's own local Service Worker state,
// not from reading this collection) — only *seeing the list of every
// device* and *removing someone else's* does, and that's exactly the part
// that shouldn't be open to every logged-in admin.
export const PushSubscriptions: CollectionConfig = {
  slug: "push-subscriptions",
  access: {
    read: masterAdmin,
    create: masterAdmin,
    update: masterAdmin,
    delete: masterAdmin,
  },
  admin: {
    group: "Site Settings",
    useAsTitle: "label",
    description:
      "Every device currently enrolled for the \"haven't posted in a while\" reminder, across everyone. Remove a row to stop that specific device from getting reminders — e.g. someone's old phone.",
    defaultColumns: ["label", "createdAt"],
    // Excludes this collection from the admin nav/routes entirely for
    // anyone who isn't Master Admin (collections/Users.ts's `role` field)
    // — a plain Admin managing their own reminders never needs this list,
    // and shouldn't be able to remove someone else's device even by
    // guessing the URL (access.read above blocks that regardless; this
    // just keeps it from being visible/tempting in the first place).
    hidden: ({ user }) => (user as { role?: string } | undefined)?.role !== "master",
  },
  fields: [
    {
      name: "endpoint",
      type: "text",
      required: true,
      unique: true,
      // `hidden`, not just `readOnly` — this is a raw push-service URL
      // with no meaning to a non-technical admin, and no reason to ever be
      // looked at (only equality-matched by the subscribe/unsubscribe
      // routes). Hidden fields still read/write completely normally via
      // the Local API/REST (this is purely an admin-UI display concern,
      // not an access-control one) — subscribe/route.ts and
      // unsubscribe/route.ts are unaffected.
      admin: { hidden: true },
    },
    {
      type: "group",
      name: "keys",
      // Same reasoning as `endpoint` — two cryptographic key strings the
      // push service needs, meaningless (and mildly alarming-looking) to
      // show someone with no programming background. Fully hidden rather
      // than merely read-only.
      admin: { hidden: true },
      fields: [
        { name: "p256dh", type: "text", required: true },
        { name: "auth", type: "text", required: true },
      ],
    },
    {
      name: "label",
      type: "text",
      // Editable, not read-only — auto-filled with a plain device
      // description at subscribe time (see lib/webPushClient.ts's
      // describeDevice()), but only a Master Admin can even reach this
      // form (access.update above), so there's no risk in letting them
      // rename an entry to something more specific, e.g. "Kaylee's
      // iPhone" once two "iPhone" rows exist and need telling apart.
      admin: {
        description:
          "Auto-filled with a plain device description when someone enables reminders — rename it to whatever helps tell devices apart.",
      },
    },
  ],
};
