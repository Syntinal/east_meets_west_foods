"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/sauce", label: "The Sauce" },
  { href: "/story", label: "Our Story" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="primary-nav" aria-label="Primary">
      <div className="nav-inner">
        <button
          className={`nav-toggle${isOpen ? " is-open" : ""}`}
          type="button"
          aria-expanded={isOpen}
          aria-controls="nav-menu"
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="nav-toggle-icon" aria-hidden="true">
            <span className="nav-toggle-bar"></span>
            <span className="nav-toggle-bar"></span>
            <span className="nav-toggle-bar"></span>
          </span>
        </button>
        <ul id="nav-menu" className={`primary-nav-list${isOpen ? " is-open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="nav-review">
            <a
              className="nav-review-link"
              href="https://www.google.com/maps/place//data=!4m3!3m2!1s0x5363d1966a6b04e9:0x6d04125dba42b761!12e1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="nav-review-star" aria-hidden="true">✨</span>
              Leave a Review
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
