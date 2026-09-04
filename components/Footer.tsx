import Link from "next/link";
import type { NavEntry } from "@/lib/navigation";

// address/phone come from the Contact global (fetched once in
// app/(frontend)/layout.tsx) rather than being hardcoded here — previously
// this had its own independent copy that silently didn't follow edits made
// to Contact. See globals/Contact.ts's top comment.
type SocialLinks = { facebook: string; instagram: string; tiktok: string };

// One entry per platform icon shown in the footer — driven off
// globals/Navigation.ts's `socialLinks` group so adding a 4th platform later
// is one array entry, not a hand-copied JSX block. Icon paths are the
// standard Simple Icons brand glyphs, inlined so no external asset/CDN is
// needed for three small footer icons.
const SOCIAL_PLATFORMS: {
  key: keyof SocialLinks;
  label: string;
  path: string;
}[] = [
  {
    key: "facebook",
    label: "Facebook",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z",
  },
  {
    key: "instagram",
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: "M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z",
  },
];

export default function Footer({
  pages,
  address,
  phone,
  socialLinks,
}: {
  pages: NavEntry[];
  address: string;
  phone: string;
  socialLinks: SocialLinks;
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
          {SOCIAL_PLATFORMS.some((platform) => socialLinks[platform.key]) && (
            <div className="footer-social-links">
              {SOCIAL_PLATFORMS.map(
                (platform) =>
                  socialLinks[platform.key] && (
                    <a
                      key={platform.key}
                      className="footer-social-link"
                      href={socialLinks[platform.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`East Meets West on ${platform.label}`}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d={platform.path} />
                      </svg>
                    </a>
                  ),
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
