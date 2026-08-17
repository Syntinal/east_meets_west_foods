import Link from "next/link";
import type { NavEntry } from "@/lib/navigation";

// address/phone come from the Contact global (fetched once in
// app/(frontend)/layout.tsx) rather than being hardcoded here — previously
// this had its own independent copy that silently didn't follow edits made
// to Contact. See globals/Contact.ts's top comment.
export default function Footer({
  pages,
  address,
  phone,
}: {
  pages: NavEntry[];
  address: string;
  phone: string;
}) {
  // The footer never listed Home separately — logo/nav already cover it.
  const footerPages = pages.filter((page) => page.key !== "home");
  // Contact's address field is free-form multi-line text (see globals/
  // Contact.ts) — collapse it to a single line for this compact footer.
  const addressLine = address.replace(/\s*\n\s*/g, ", ");
  const telHref = (() => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
  })();

  return (
    <footer className="site-footer">
      <div className="footer-slim">
        <p className="footer-slim-top">
          East Meets West LLC
          {addressLine && <> &nbsp;&middot;&nbsp; {addressLine}</>}
          {phone && (
            <>
              {" "}
              &nbsp;&middot;&nbsp; <a className="footer-tel" href={telHref}>{phone}</a>
            </>
          )}
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
