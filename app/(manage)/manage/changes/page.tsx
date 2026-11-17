import { requireManageUser } from "@/lib/manage/auth";
import { listMenuChanges } from "@/lib/manage/menu";
import { listPageChanges } from "@/lib/manage/websiteOps";
import { Screen } from "@/components/manage/Screen";
import { ChangesReview } from "@/components/manage/ChangesReview";

export const dynamic = "force-dynamic";

// Every saved change that isn't on the website yet — menu items and website pages.
export default async function ChangesWaitingPage() {
  const { payload, user } = await requireManageUser();
  const [menuChanges, pageChanges] = await Promise.all([listMenuChanges(payload, user), listPageChanges({ payload, user })]);
  return (
    <Screen
      title="Changes not on the website yet"
      intro="Look over each one. Nothing goes on the website until you tap its button."
      back={{ href: "/manage", label: "Home" }}
    >
      <ChangesReview menuChanges={menuChanges} pageChanges={pageChanges} />
    </Screen>
  );
}
