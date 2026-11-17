import type { Metadata, Viewport } from "next";
import "./manage.css";

// The simplified owner-facing editor. Its own root layout (own <html>/<body>),
// separate from both the public site (app/(frontend)) and Payload's admin
// (app/(payload)) so neither one's CSS leaks in — same reasoning as the
// existing frontend/admin split.
export const metadata: Metadata = {
  title: "Website Helper — East Meets West",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function ManageRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="m-body">{children}</body>
    </html>
  );
}
