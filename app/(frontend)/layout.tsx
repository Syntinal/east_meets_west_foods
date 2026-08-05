import type { Metadata, Viewport } from "next";
import { draftMode } from "next/headers";
import config from "@payload-config";
import { getPayload } from "payload";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import DraftModeBanner from "@/components/DraftModeBanner";
import { RefreshOnSave } from "@/components/live-preview/RefreshOnSave";
import { NAV_PAGES, type NavEntry } from "@/lib/navigation";
import "./globals.css";

// Statically rendered for real visitors — the Navigation global's and
// Pages' afterChange hooks call revalidatePath("/", "layout") on save, so
// pages stay fast and cacheable without needing to re-check on every
// request. Reading draftMode() below opts this into dynamic, uncached
// rendering whenever an editor is previewing (see getVisiblePages), which
// is also what lets it show not-yet-published pages in the nav then.

export const metadata: Metadata = {
  metadataBase: new URL("https://eastmeetswestfoods.co"),
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/bao_bun.png", type: "image/png" },
    ],
    apple: "/assets/bao_bun.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Static NAV_PAGES entries get an implicit position (0, 10, 20, …) so
// admin-created Pages can be slotted anywhere between them via their own
// `navOrder` field — see collections/Pages.ts.
const STATIC_NAV_ORDER = new Map(NAV_PAGES.map((page, i) => [page.key, i * 10]));

async function getVisiblePages(isDraftMode: boolean): Promise<NavEntry[]> {
  const payload = await getPayload({ config });
  const [nav, dynamicPages] = await Promise.all([
    payload.findGlobal({ slug: "navigation" }) as unknown as Promise<Record<string, unknown>>,
    payload.find({
      collection: "pages",
      // In draft mode, show draft (unpublished) pages too, so an editor
      // previewing sees the nav exactly as it'll look once published —
      // otherwise a still-draft page with "Show in navigation" checked
      // would misleadingly stay invisible in its own preview. Outside
      // draft mode (real visitors), published-only, same as everywhere else.
      where: isDraftMode
        ? { "navigation.showInNav": { equals: true } }
        : { and: [{ "navigation.showInNav": { equals: true } }, { _status: { equals: "published" } }] },
      draft: isDraftMode,
      limit: 100,
      overrideAccess: true,
    }),
  ]);

  const staticEntries = NAV_PAGES.filter((page) => nav[page.key] !== false).map((page) => ({
    ...page,
    order: STATIC_NAV_ORDER.get(page.key) ?? 0,
  }));

  const dynamicEntries = dynamicPages.docs.map((doc) => {
    const navData = doc.navigation as { navLabel?: string | null; navOrder?: number | null } | undefined;
    return {
      key: `page-${doc.slug}`,
      href: `/${doc.slug}`,
      label: navData?.navLabel || doc.title,
      order: typeof navData?.navOrder === "number" ? navData.navOrder : 100,
    };
  });

  return [...staticEntries, ...dynamicEntries].sort((a, b) => a.order - b.order);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  const visiblePages = await getVisiblePages(isDraftMode);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Saira+Stencil+One&family=Fredoka:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {isDraftMode && <DraftModeBanner />}
        {isDraftMode && <RefreshOnSave />}
        <Nav pages={visiblePages} />
        {children}
        <Footer pages={visiblePages} />
      </body>
    </html>
  );
}
