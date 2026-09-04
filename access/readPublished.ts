import type { Access } from "payload";

// Standard Payload drafts-aware read access: logged-in admins (editing in
// /admin, or previewing via draft mode) see everything, including drafts.
// Anonymous/public requests only ever see published documents — drafts can
// never leak through the public REST API.
export const readPublished: Access = ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: "published" } };
};
