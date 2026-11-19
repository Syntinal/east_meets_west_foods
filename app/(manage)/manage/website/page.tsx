import Link from "next/link";
import { requireManageUser } from "@/lib/manage/auth";
import { hasWaitingChanges, listCustomPageDefs } from "@/lib/manage/websiteOps";
import { WEBSITE_PAGES, type PageDef } from "@/lib/manage/websitePages";
import { Screen } from "@/components/manage/Screen";

export const dynamic = "force-dynamic";

const MAIN = new Set(["home", "sauce", "story", "faq", "contact"]);

export default async function WebsitePagesPage() {
  const { payload, user } = await requireManageUser();
  const s = { payload, user };
  const custom = await listCustomPageDefs(s);
  const all = [...WEBSITE_PAGES, ...custom];
  const waiting = new Map(await Promise.all(all.map(async (p) => [p.slug, await hasWaitingChanges(s, p)] as const)));

  const tiles = (pages: PageDef[]) => (
    <ul className="m-tiles">
      {pages.map((p) => (
        <li key={p.slug}>
          <Link href={`/manage/website/${p.slug}`} className="m-tile">
            <span className="m-tile-icon" aria-hidden="true">
              {p.icon}
            </span>
            <span>
              <span className="m-tile-label">{p.label}</span>
              {waiting.get(p.slug) ? (
                <span className="m-badge m-badge--warn" style={{ marginTop: 6 }}>
                  Changes not on the website yet
                </span>
              ) : (
                <span className="m-tile-hint">{p.hint ?? `eastmeetswestfoods.co${p.sitePath === "/" ? "" : p.sitePath}`}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <Screen title="Change words or photos" intro="Which page do you want to change?" back={{ href: "/manage", label: "Home" }}>
      {tiles(WEBSITE_PAGES.filter((p) => MAIN.has(p.slug)))}

      {custom.length > 0 && (
        <>
          <h2 className="m-subhead">Your other pages</h2>
          {tiles(custom)}
        </>
      )}

      <h2 className="m-subhead">Words around the menu, news and reviews</h2>
      {tiles(WEBSITE_PAGES.filter((p) => !MAIN.has(p.slug)))}

      <p className="m-hint" style={{ marginTop: 24 }}>
        The dishes, your posts and the reviews each have their own button on the home screen. Making a brand-new page is
        done in the regular editor — reach out if you need one.
      </p>
    </Screen>
  );
}
