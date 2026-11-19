import { requireManageUser } from "@/lib/manage/auth";
import { listMenuItems } from "@/lib/manage/menu";
import { Screen } from "@/components/manage/Screen";
import { MenuBoard } from "@/components/manage/menu/MenuBoard";

export const dynamic = "force-dynamic";

export default async function ManageMenuPage() {
  const { payload, user } = await requireManageUser();
  const items = await listMenuItems(payload, user);
  const changesWaiting = items.filter((i) => i.status !== "live").length;
  return (
    <Screen title="Change the menu" back={{ href: "/manage", label: "Home" }}>
      <MenuBoard items={items} changesWaiting={changesWaiting} />
    </Screen>
  );
}
