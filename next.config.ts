import type { NextConfig } from "next";

// Mirrors the old Cloudflare Pages _headers / _redirects files.
const nextConfig: NextConfig = {
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

export default nextConfig;
