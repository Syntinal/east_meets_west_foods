import Link from "next/link";
import { requireManageUser } from "@/lib/manage/auth";
import { hasWaitingChanges } from "@/lib/manage/websiteOps";
import { WEBSITE_PAGES } from "@/lib/manage/websitePages";
import { Screen } from "@/components/manage/Screen";

export const dynamic = "force-dynamic";

export default async function WebsitePagesPage() {
  const { payload, user } = await requireManageUser();
  const waiting = await Promise.all(WEBSITE_PAGES.map((p) => hasWaitingChanges({ payload, user }, p.slug)));
  return (
    <Screen title="Change words or photos" intro="Which page do you want to change?" back={{ href: "/manage", label: "Home" }}>
      <ul className="m-tiles">
        {WEBSITE_PAGES.map((p, i) => (
          <li key={p.slug}>
            <Link href={`/manage/website/${p.slug}`} className="m-tile">
              <span className="m-tile-icon" aria-hidden="true">
                {p.icon}
              </span>
              <span>
                <span className="m-tile-label">{p.label}</span>
                {waiting[i] ? (
                  <span className="m-badge m-badge--warn" style={{ marginTop: 6 }}>
                    Changes not on the website yet
                  </span>
                ) : (
                  <span className="m-tile-hint">eastmeetswestfoods.co{p.sitePath === "/" ? "" : p.sitePath}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="m-hint" style={{ marginTop: 24 }}>
        The menu has its own button on the home screen. Other pages are changed in the regular editor — ask for help if you
        need one changed.
      </p>
    </Screen>
  );
}
