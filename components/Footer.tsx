import Link from "next/link";
import type { NavPage } from "@/lib/navigation";

export default function Footer({ pages }: { pages: NavPage[] }) {
  // The footer never listed Home separately — logo/nav already cover it.
  const footerPages = pages.filter((page) => page.key !== "home");

  return (
    <footer className="site-footer">
      <div className="footer-slim">
        <p className="footer-slim-top">
          East Meets West LLC &nbsp;&middot;&nbsp; 476534 US HWY 95, Suite B, Ponderay, ID 83852 &nbsp;&middot;&nbsp;{" "}
          <a className="footer-tel" href="tel:+12086276283">(208)&nbsp;627-6283</a>
        </p>
        <div className="footer-slim-bottom">
          <span>&copy; East Meets West LLC</span>
          <nav className="footer-slim-nav" aria-label="Footer">
            {footerPages.map((page) => (
              <Link key={page.href} href={page.href}>
                {page.shortLabel ?? page.label}
              </Link>
            ))}
            {/* Plain <a>, not next/link: /admin lives under its own root
                layout (app/(payload)), a separate app from the frontend's
                React tree, so it should be a full page load rather than a
                client-side transition. */}
            <a href="/admin">Admin</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
