/**
 * Hosts whose channel logos go through Next's image optimizer (resized + WebP, cached on the CDN).
 * Logos from any other https host still work, just served as-is. Add a host here when a logo is
 * large or slow; next.config.ts builds `images.remotePatterns` from this list.
 */
export const LOGO_HOSTS = [
  "upload.wikimedia.org",
  "btnrwanda.com",
  "static.wixstatic.com",
  "www.isibomedia.com",
  // iptv-org's community logo uploads; optimized copies are cached for 30 days.
  "i.imgur.com",
  "i.postimg.cc",
];

/** True when `src` can be served through next/image (allowlisted host, raster image). */
export function isOptimizableLogo(src: string): boolean {
  try {
    const url = new URL(src);
    // SVGs are tiny and next/image refuses them without dangerouslyAllowSVG.
    return url.protocol === "https:" && LOGO_HOSTS.includes(url.hostname) && !/\.svg$/i.test(url.pathname);
  } catch {
    return false;
  }
}
