import { requireManageUser } from "@/lib/manage/auth";
import { listRemovedPosts } from "@/lib/manage/postsOps";
import { Screen } from "@/components/manage/Screen";
import { RemovedList } from "@/components/manage/menu/RemovedList";
import { restorePost } from "../actions";

export const dynamic = "force-dynamic";

export default async function RemovedPostsPage() {
  const { payload, user } = await requireManageUser();
  const items = await listRemovedPosts({ payload, user });
  return (
    <Screen
      title="Posts you took down"
      intro="Tap “Bring it back” to put a post back on your website exactly as it was."
      back={{ href: "/manage/posts", label: "Posts" }}
    >
      <RemovedList
        items={items}
        restore={restorePost}
        restoredText="✓ Back on the website"
        emptyText="You haven't taken any posts down."
        back={{ href: "/manage/posts", label: "Back to your posts" }}
      />
    </Screen>
  );
}
