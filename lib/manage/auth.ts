import { headers } from "next/headers";
import { redirect } from "next/navigation";
import config from "@payload-config";
import { getPayload } from "payload";

// Every /manage page and server action starts here. Reads the same
// `payload-token` cookie /admin uses (one login works for both), via
// Payload's own auth check — no separate session system.
//
// Callers then pass `user` + `overrideAccess: false` to every Local API
// call, so the collections' own access rules still apply. The Local API's
// default is overrideAccess: true, which would silently skip them.
export async function getManageSession() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, user };
}

export type ManageSession = Awaited<ReturnType<typeof getManageSession>>;
export type ManageUser = NonNullable<ManageSession["user"]>;

/** For pages: sends a signed-out visitor to the login screen. */
export async function requireManageUser(): Promise<{ payload: ManageSession["payload"]; user: ManageUser }> {
  const session = await getManageSession();
  if (!session.user) redirect("/manage/login");
  return { payload: session.payload, user: session.user };
}
