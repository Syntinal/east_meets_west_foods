import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import config from "@payload-config";
import { getPayload } from "payload";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import { isSimpleEditor } from "@/lib/manage/roles";
import { importMap } from "../importMap.js";

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

// Simple editors (the owner) are sent to the simplified /manage screens
// whenever they land on /admin — an old bookmark, the old Home Screen icon,
// or signing in through /admin/login. Developers (admin/master) aren't
// affected. Redirected, not blocked: their account can still do everything
// /manage offers, and a developer can switch their account type in
// Users if they ever need /admin itself.
const Page = async ({ params, searchParams }: Args) => {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (isSimpleEditor(user)) redirect("/manage");
  return RootPage({ config, params, searchParams, importMap });
};

export default Page;
