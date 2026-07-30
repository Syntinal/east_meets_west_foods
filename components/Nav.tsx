"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavPage } from "@/lib/navigation";

export default function Nav({ pages }: { pages: NavPage[] }) {
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
          {pages.map((page) => {
            const isActive =
              page.href === "/"
                ? pathname === "/"
                : pathname === page.href || pathname.startsWith(`${page.href}/`);
            return (
              <li key={page.href}>
                <Link
                  href={page.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {page.label}
                </Link>
              </li>
            );
          })}
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
