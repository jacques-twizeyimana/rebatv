import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Off on purpose: with Partial Prefetching, params not listed at build time (e.g. a channel added
  // in /sandberg after deploy) are first served from the generic App Shell, and their metadata
  // stayed generic + noindex. Without it, the first request renders the real page (and a real 404
  // for unknown slugs) and caches that.
  partialPrefetching: false,
  poweredByHeader: false,
  reactStrictMode: true,
  cacheLife: {
    // The channel catalogue changes rarely and is invalidated on demand by admin edits.
    catalog: { stale: 60 * 60, revalidate: 60 * 60 * 24 * 7, expire: 60 * 60 * 24 * 30 },
  },
  serverExternalPackages: ["@node-rs/argon2"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sandberg/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
