import type { AccessArgs } from "payload";

// Standard Payload pattern: content is publicly readable, but only a
// logged-in admin can create/update/delete it.
export const authenticated = ({ req: { user } }: AccessArgs) => Boolean(user);
