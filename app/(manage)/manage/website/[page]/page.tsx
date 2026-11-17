import { notFound } from "next/navigation";
import { requireManageUser } from "@/lib/manage/auth";
import { getPageView } from "@/lib/manage/websiteOps";
import { getPageDef } from "@/lib/manage/websitePages";
import { Screen } from "@/components/manage/Screen";
import { PageEditor } from "@/components/manage/website/PageEditor";

export const dynamic = "force-dynamic";

export default async function EditWebsitePage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = getPageDef(page);
  if (!def) notFound();
  const { payload, user } = await requireManageUser();
  const view = await getPageView({ payload, user }, def);
  return (
    <Screen back={{ href: "/manage/website", label: "Pages" }}>
      <PageEditor def={def} view={view} />
    </Screen>
  );
}
