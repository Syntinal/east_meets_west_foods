import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

// Mirrors the old Cloudflare Pages _headers / _redirects files.
const nextConfig: NextConfig = {
  // Development only: lets a phone on the same Wi-Fi open the dev server
  // (e.g. http://192.168.1.112:3000/manage) with working buttons — Next.js
  // otherwise blocks its dev scripts for any host but localhost. Set
  // DEV_ALLOWED_ORIGINS in .env (comma-separated hosts). No effect in
  // production builds.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      // The old Visit page was merged into Contact — keep old links working.
      { source: "/visit.html", destination: "/contact", permanent: true },
      { source: "/visit", destination: "/contact", permanent: true },
    ];
  },
};

export default withPayload(nextConfig);
