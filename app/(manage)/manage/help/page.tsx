import Link from "next/link";
import { requireManageUser } from "@/lib/manage/auth";
import { helpSmsHref, helpTelHref } from "@/lib/manage/help";
import { Screen } from "@/components/manage/Screen";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  {
    q: "Did my post really go out?",
    a: "Recent activity lists every post. A ✓ means it worked. If it says “not sure yet”, tap Try again on the post — it checks first and won't post twice.",
    href: "/manage/activity",
    button: "Open Recent activity",
  },
  {
    q: "It says “not on the website yet.” What does that mean?",
    a: "You saved a change, but it isn't showing to customers yet. Look it over, then tap Put on website.",
    href: "/manage/changes",
    button: "See changes waiting",
  },
  {
    q: "I removed something by mistake.",
    a: "Menu items you remove are kept. Tap Bring it back.",
    href: "/manage/menu/removed",
    button: "Open Recently removed",
  },
  {
    q: "There's a mistake in a post I already made.",
    a: "Open Your posts and tap the post. You can fix the words, or take it off the website. Facebook, Instagram and TikTok keep what they already have.",
    href: "/manage/posts",
    button: "Open Your posts",
  },
  {
    q: "I took a post down by mistake.",
    a: "Posts you take down are kept. Tap Bring it back.",
    href: "/manage/posts/removed",
    button: "Open Posts you took down",
  },
  {
    q: "I changed something by mistake.",
    a: "Right after you save, an Undo button shows for 30 seconds. After that, call or text for help — earlier versions are always kept.",
  },
];

export default async function ManageHelpPage() {
  await requireManageUser();
  const tel = helpTelHref();
  const sms = helpSmsHref();

  return (
    <Screen title="Get help" back={{ href: "/manage", label: "Home" }} hideHelp>
      <p className="m-intro">Stuck, or not sure something worked? Reach out with any questions.</p>
      {tel && sms ? (
        <div className="m-stack">
          <a href={tel} className="m-btn m-btn--primary m-btn--block m-btn--tall">
            📞 Call for help
          </a>
          <a href={sms} className="m-btn m-btn--block m-btn--tall">
            💬 Text for help
          </a>
        </div>
      ) : (
        <p className="m-notice">Reach out with any questions — we&apos;re happy to help.</p>
      )}

      <h2>Quick answers</h2>
      <ul className="m-cards">
        {QUESTIONS.map((item) => (
          <li key={item.q} className="m-card">
            <p className="m-card-title" style={{ fontSize: 20 }}>
              {item.q}
            </p>
            <p style={{ margin: "6px 0 12px" }}>{item.a}</p>
            {item.href && (
              <Link href={item.href} className="m-btn m-btn--block">
                {item.button}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <h2>Good to know</h2>
      <ul>
        <li>You can&apos;t break the website. Changes can always be put back.</li>
        <li>Nothing goes on the website until you tap a button that says so. (“Sold out today” is the one exception — it&apos;s instant.)</li>
      </ul>
    </Screen>
  );
}
