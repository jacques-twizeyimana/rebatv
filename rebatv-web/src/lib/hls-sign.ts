import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs nested playlist URLs that the /hls proxy writes into the playlists it serves, so the proxy
 * only ever fetches URLs found in a channel's own playlist chain, even when a broadcaster spreads
 * them over several hosts (Bloomberg's variants live on a different CDN than its master).
 */
function secret(): string {
  const s = process.env.HLS_SIGNING_SECRET || process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("HLS_SIGNING_SECRET or SESSION_SECRET must be set (32+ characters)");
  return s;
}

export function signPlaylistUrl(slug: string, url: string): string {
  return createHmac("sha256", secret()).update(`hls\n${slug}\n${url}`).digest("base64url").slice(0, 32);
}

export function verifyPlaylistUrl(slug: string, url: string, sig: string | null): boolean {
  if (!sig) return false;
  const expected = Buffer.from(signPlaylistUrl(slug, url));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
