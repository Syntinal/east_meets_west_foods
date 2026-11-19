import { notFound } from "next/navigation";
import { requireManageUser } from "@/lib/manage/auth";
import { getPageView, resolvePageDef } from "@/lib/manage/websiteOps";
import { Screen } from "@/components/manage/Screen";
import { PageEditor } from "@/components/manage/website/PageEditor";

export const dynamic = "force-dynamic";

export default async function EditWebsitePage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const { payload, user } = await requireManageUser();
  const def = await resolvePageDef({ payload, user }, page);
  if (!def) notFound();
  const view = await getPageView({ payload, user }, def);
  return (
    <Screen back={{ href: "/manage/website", label: "Pages" }}>
      <PageEditor def={def} view={view} />
    </Screen>
  );
}
