/**
 * HLS playlist rewriting for the /hls proxy (src/app/hls/[slug]/[file]/route.ts).
 *
 * Only playlists go through the proxy; everything heavy (media segments, init sections, keys)
 * is rewritten to an absolute URL and fetched by the player straight from the broadcaster.
 */

// Tags whose URI attribute points at another playlist (these stay on the proxy).
const PLAYLIST_URI_TAGS = ["#EXT-X-MEDIA:", "#EXT-X-I-FRAME-STREAM-INF:", "#EXT-X-RENDITION-REPORT:"];

export function isPlaylistUrl(url: URL): boolean {
  return /\.m3u8$/i.test(url.pathname);
}

/**
 * Rewrites every URI in `text` (fetched from `baseUrl`): playlists → `proxy(absoluteUrl)`,
 * everything else → absolute upstream URL.
 */
export function rewritePlaylist(text: string, baseUrl: string, proxy: (absolute: string) => string): string {
  const resolve = (uri: string) => new URL(uri, baseUrl).toString();
  let nextIsVariant = false;

  return text
    .split(/\r?\n/)
    .map((raw) => {
      const line = raw.trim();
      if (!line) return line;

      if (line.startsWith("#")) {
        if (line.startsWith("#EXT-X-STREAM-INF")) nextIsVariant = true;
        if (!line.includes('URI="')) return line;
        const toProxy = PLAYLIST_URI_TAGS.some((t) => line.startsWith(t));
        return line.replace(/URI="([^"]*)"/g, (_m, uri: string) => {
          const abs = resolve(uri);
          return `URI="${toProxy ? proxy(abs) : abs}"`;
        });
      }

      const abs = resolve(line);
      const variant = nextIsVariant || isPlaylistUrl(new URL(abs));
      nextIsVariant = false;
      return variant ? proxy(abs) : abs;
    })
    .join("\n");
}

/** Path of a proxied playlist. The master playlist has no `u`; nested ones carry their upstream URL. */
export function hlsProxyPath(slug: string, upstream?: string): string {
  if (!upstream) return `/hls/${slug}/playlist.m3u8`;
  const name = new URL(upstream).pathname.split("/").pop() || "playlist.m3u8";
  return `/hls/${slug}/${encodeURIComponent(name)}?u=${encodeURIComponent(upstream)}`;
}
