import { notFound } from "next/navigation";
import { requireManageUser } from "@/lib/manage/auth";
import { getPost } from "@/lib/manage/postsOps";
import { Screen } from "@/components/manage/Screen";
import { PostEditor } from "@/components/manage/posts/PostEditor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const { payload, user } = await requireManageUser();
  const post = await getPost({ payload, user }, id);
  if (!post) notFound();
  return (
    <Screen back={{ href: "/manage/posts", label: "Posts" }}>
      <PostEditor post={post} />
    </Screen>
  );
}
