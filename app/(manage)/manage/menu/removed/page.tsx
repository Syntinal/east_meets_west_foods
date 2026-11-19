import { requireManageUser } from "@/lib/manage/auth";
import { listRemovedMenuItems } from "@/lib/manage/menuOps";
import { Screen } from "@/components/manage/Screen";
import { RemovedList } from "@/components/manage/menu/RemovedList";

export const dynamic = "force-dynamic";

export default async function RemovedMenuItemsPage() {
  const { payload, user } = await requireManageUser();
  const r = await listRemovedMenuItems({ payload, user });
  return (
    <Screen
      title="Recently removed"
      intro="Things you removed from the menu. Tap “Bring it back” to put one back exactly as it was."
      back={{ href: "/manage/menu", label: "Menu" }}
    >
      <RemovedList items={r.ok ? r.items : []} />
    </Screen>
  );
}
