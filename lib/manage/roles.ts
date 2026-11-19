// Account types (collections/Users.ts `role`):
//   "simple"  — the owner. Always uses /manage; /admin redirects there.
//   "admin" / "master" — developers. Use /admin; see an "Advanced editor"
//   link inside /manage.
export function isSimpleEditor(user: unknown): boolean {
  return (user as { role?: string } | null | undefined)?.role === "simple";
}
