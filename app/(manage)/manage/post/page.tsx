import { requireManageUser } from "@/lib/manage/auth";
import { HELP_CONTACT } from "@/lib/manage/help";
import { getPostablePlatforms } from "@/lib/manage/platforms";
import { Screen } from "@/components/manage/Screen";
import { PostWizard } from "@/components/manage/post/PostWizard";

export const dynamic = "force-dynamic";
// The "Post it" server action runs the real social posting inline (Post
// for Me create + a short result poll per platform, in parallel — see
// collections/News.ts). Same 60s ceiling the rest of the app relies on.
export const maxDuration = 60;

export default async function ManagePostPage() {
  await requireManageUser();
  return (
    <Screen back={{ href: "/manage", label: "Home" }}>
      <PostWizard platforms={getPostablePlatforms()} helpName={HELP_CONTACT.name} />
    </Screen>
  );
}
