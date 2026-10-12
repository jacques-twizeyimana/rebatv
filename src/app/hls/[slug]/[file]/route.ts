import type { NextRequest } from "next/server";
import { getCatalog } from "@/lib/data/catalog";
import { hlsProxyPath, isPlaylistUrl, rewritePlaylist } from "@/lib/hls";

/**
 * Same-origin proxy for HLS *playlists* only (segments are fetched straight from the broadcaster).
 *
 * Some broadcaster servers gzip their playlists in ways that break for part of the audience
 * (ERR_CONTENT_DECODING_FAILED behind certain proxies/antivirus), and some send no CORS header.
 * Fetching the playlist here uncompressed and serving it from our origin sidesteps both.
 *
 * Not an open proxy: only `.m3u8` URLs on the same origin as a published channel's stream URL.
 */

const MAX_PLAYLIST_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 8000;

const error = (status: number, message: string) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, ctx: RouteContext<"/hls/[slug]/[file]">) {
  const { slug, file } = await ctx.params;
  if (!/\.m3u8$/i.test(file)) return error(404, "Not found");

  const channel = (await getCatalog()).channels.find((c) => c.slug === slug);
  if (!channel?.streamUrl) return error(404, "Unknown channel");

  const master = new URL(channel.streamUrl);
  const u = request.nextUrl.searchParams.get("u");
  let target = master;
  if (u) {
    try {
      target = new URL(u);
    } catch {
      return error(400, "Bad playlist URL");
    }
    if (target.origin !== master.origin || !isPlaylistUrl(target)) return error(400, "Playlist not allowed");
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "Accept-Encoding": "identity", Accept: "application/vnd.apple.mpegurl, */*", "User-Agent": "Mozilla/5.0 (compatible; rebaTV/1.0)" },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return error(504, "Upstream timed out");
  }
  if (!upstream.ok) return error(upstream.status === 404 ? 404 : 502, `Upstream returned ${upstream.status}`);

  const text = await upstream.text();
  if (text.length > MAX_PLAYLIST_BYTES || !text.trimStart().startsWith("#EXTM3U")) return error(502, "Upstream is not an HLS playlist");

  const body = rewritePlaylist(text, upstream.url || target.toString(), (abs) => hlsProxyPath(slug, abs));
  const isMaster = text.includes("#EXT-X-STREAM-INF");

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      // Live media playlists change every few seconds; the short shared cache collapses
      // concurrent viewers into one upstream request. Master playlists change rarely.
      "Cache-Control": isMaster
        ? "public, max-age=5, s-maxage=30, stale-while-revalidate=30"
        : "public, max-age=1, s-maxage=2, stale-while-revalidate=2",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
