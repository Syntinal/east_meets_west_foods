import Link from "next/link";
import { requireManageUser } from "@/lib/manage/auth";
import { listPosts } from "@/lib/manage/postsOps";
import { Screen } from "@/components/manage/Screen";
import { postDate } from "@/lib/manage/bannerChoices";

export const dynamic = "force-dynamic";

// "Your posts": the posts on the website, newest first. Tap one to fix its
// words, put it on the home page banner, or take it down.
export default async function PostsPage() {
  const { payload, user } = await requireManageUser();
  const posts = await listPosts({ payload, user });
  return (
    <Screen title="Your posts" intro="Tap a post to fix its words, show it at the top of your home page, or take it down." back={{ href: "/manage", label: "Home" }}>
      <Link href="/manage/post" className="m-btn m-btn--primary m-btn--block" style={{ marginBottom: 20 }}>
        + Make a new post
      </Link>
      {posts.length === 0 && <p className="m-notice">There are no posts on the website yet.</p>}
      <ul className="m-cards">
        {posts.map((p) => (
          <li key={String(p.id)}>
            <Link href={`/manage/posts/${p.id}`} className="m-card m-post-row">
              {p.thumbUrl ? <img src={p.thumbUrl} alt="" className="m-post-thumb" /> : <span className="m-post-thumb m-post-thumb--none" aria-hidden="true">📝</span>}
              <span className="m-post-body">
                <span className="m-card-sub">{postDate(p.date)}</span>
                <span className="m-post-text">{p.message}</span>
                {p.banner.on && <span className="m-badge m-badge--good">⭐ On your home page</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/manage/posts/removed" className="m-btn m-btn--block" style={{ marginTop: 24 }}>
        Posts you took down
      </Link>
    </Screen>
  );
}
