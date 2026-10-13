import type { NextConfig } from "next";
import { LOGO_HOSTS } from "./src/lib/logo";

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
  // Self-contained server build (server.js + traced node_modules) that deploy/deploy.sh releases.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  cacheLife: {
    // The channel catalogue changes rarely and is invalidated on demand by admin edits.
    catalog: { stale: 60 * 60, revalidate: 60 * 60 * 24 * 7, expire: 60 * 60 * 24 * 30 },
  },
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    // Channel logos are hotlinked from their hosts and optimized here (see src/lib/logo.ts).
    remotePatterns: LOGO_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 828, 1080, 1280, 1920, 2560, 3840],
    imageSizes: [64, 96, 128, 192, 256, 384],
    // Logos rarely change; keep optimized copies for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sandberg/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
