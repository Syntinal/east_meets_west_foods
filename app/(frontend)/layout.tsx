import type { Metadata, Viewport } from "next";
import config from "@payload-config";
import { getPayload } from "payload";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { NAV_PAGES } from "@/lib/navigation";
import "./globals.css";

// Statically rendered — the Navigation global's afterChange hook calls
// revalidatePath("/", "layout") to bust this on save, so pages stay fast
// and cacheable without needing to re-check on every single request.

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

async function getVisiblePages() {
  const payload = await getPayload({ config });
  const nav = (await payload.findGlobal({ slug: "navigation" })) as unknown as Record<string, unknown>;
  return NAV_PAGES.filter((page) => nav[page.key] !== false);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const visiblePages = await getVisiblePages();

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
        <Nav pages={visiblePages} />
        {children}
        <Footer pages={visiblePages} />
      </body>
    </html>
  );
}
