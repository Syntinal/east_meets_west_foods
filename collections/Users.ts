import type { CollectionConfig } from "payload";

// Single owner login for now — Payload supports adding more admin
// users/roles later without any config restructuring.
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [],
};
