import { notFound } from "next/navigation";
import { requireManageUser } from "@/lib/manage/auth";
import { getMenuItem } from "@/lib/manage/menu";
import { Screen } from "@/components/manage/Screen";
import { MenuItemEditor } from "@/components/manage/menu/MenuItemEditor";

export const dynamic = "force-dynamic";

export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { payload, user } = await requireManageUser();
  const item = await getMenuItem(payload, user, id);
  if (!item) notFound();
  return (
    <Screen back={{ href: "/manage/menu", label: "Menu" }}>
      <MenuItemEditor item={item} />
    </Screen>
  );
}
