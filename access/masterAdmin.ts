import type { AccessArgs } from "payload";

// Gate for anything only a "Master Admin" should be able to do — see
// collections/Users.ts's `role` field. Distinct from `authenticated.ts`
// (any logged-in user): this project has 3 real admin accounts with no
// prior role distinction (see CLAUDE.md's item 36 correction), so a
// destructive action affecting *other people's* own things — right now,
// just removing someone else's enrolled reminder device — needs this
// tighter check instead of the usual any-logged-in-user one.
export const masterAdmin = ({ req: { user } }: AccessArgs) => (user as { role?: string } | null)?.role === "master";
