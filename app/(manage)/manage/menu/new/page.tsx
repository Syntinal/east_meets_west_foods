import { requireManageUser } from "@/lib/manage/auth";
import { Screen } from "@/components/manage/Screen";
import { MenuItemEditor } from "@/components/manage/menu/MenuItemEditor";

export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  await requireManageUser();
  return (
    <Screen back={{ href: "/manage/menu", label: "Menu" }}>
      <MenuItemEditor item={null} />
    </Screen>
  );
}
