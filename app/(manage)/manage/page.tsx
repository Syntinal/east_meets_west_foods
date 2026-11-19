import Link from "next/link";
import { requireManageUser } from "@/lib/manage/auth";
import { daysAgoInWords, getLastSuccessfulPostDate } from "@/lib/manage/lastPost";
import { countChangesWaiting } from "@/lib/manage/menu";
import { countPagesWaiting } from "@/lib/manage/websiteOps";
import { isSimpleEditor } from "@/lib/manage/roles";
import { Screen } from "@/components/manage/Screen";
import { SignOutButton } from "@/components/manage/SignOutButton";

export const dynamic = "force-dynamic";

const TASKS = [
  { href: "/manage/post", icon: "📣", label: "Tell customers something", hint: "Post a photo and a message" },
  { href: "/manage/posts", icon: "📰", label: "Your posts", hint: "Fix, feature or take down a post" },
  { href: "/manage/menu", icon: "🥟", label: "Change the menu", hint: "Prices, items, and sold out" },
  { href: "/manage/website", icon: "✏️", label: "Change words or photos", hint: "Any page of the website" },
  { href: "/manage/reviews", icon: "⭐", label: "Add a customer review", hint: "Copy a good one from Google" },
  { href: "/manage/activity", icon: "🕘", label: "Recent activity", hint: "What's been posted and changed" },
  { href: "/manage/reminders", icon: "🔔", label: "Reminders", hint: "A nudge when it's time to post" },
  { href: "/manage/help", icon: "📞", label: "Get help", hint: "Call or text for help" },
];

export default async function ManageHomePage() {
  const { payload, user } = await requireManageUser();
  const [lastPost, menuWaiting, pagesWaiting] = await Promise.all([
    getLastSuccessfulPostDate(payload, user),
    countChangesWaiting(payload, user),
    countPagesWaiting({ payload, user }),
  ]);
  const changesWaiting = menuWaiting + pagesWaiting;

  return (
    <Screen title="What would you like to do?">
      {changesWaiting > 0 && (
        <div className="m-notice m-notice--warn">
          <p style={{ margin: "0 0 12px" }}>
            <strong>
              {changesWaiting === 1 ? "1 change is" : `${changesWaiting} changes are`} saved but not on the website yet.
            </strong>
          </p>
          <Link href="/manage/changes" className="m-btn m-btn--primary m-btn--block">
            Review and put on the website
          </Link>
        </div>
      )}
      <p className="m-notice">
        {lastPost ? (
          <>
            Your last post went out <strong>{daysAgoInWords(lastPost)}</strong>.
          </>
        ) : (
          <>Nothing has been posted yet.</>
        )}
      </p>
      <ul className="m-tiles">
        {TASKS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="m-tile">
              <span className="m-tile-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span>
                <span className="m-tile-label">{t.label}</span>
                <span className="m-tile-hint">{t.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="m-footer-actions">
        <SignOutButton />
        {/* Developers only (admin/master accounts) — the owner's Simple
            editor account never sees this, and /admin sends them back here. */}
        {!isSimpleEditor(user) && (
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/admin" className="m-textbtn" style={{ display: "inline-flex" }}>
              Advanced editor
            </a>
          </p>
        )}
      </div>
    </Screen>
  );
}
