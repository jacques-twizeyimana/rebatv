import type { Lineup, Located } from "./types";

const DEFAULT_API_BASE = "https://rebatv.bugufi.link";
const TIMEOUT_MS = 12000;

/**
 * Origin of rebatv-web. The packaged webOS app runs from file:// and talks to the configured
 * origin; the hosted build (VIDAA, /tv/) and the dev server (which proxies /api and /hls) use
 * their own origin.
 */
export function resolveApiBase(protocol: string, configured: string | undefined): string {
  if (protocol !== "file:") return "";
  return (configured || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export const API_BASE = resolveApiBase(
  typeof location === "undefined" ? "file:" : location.protocol,
  import.meta.env.VITE_API_BASE as string | undefined,
);

/** Absolute URL for a path on rebatv-web; absolute URLs pass through. */
export function apiUrl(pathOrUrl: string, base = API_BASE): string {
  return pathOrUrl.charAt(0) === "/" ? base + pathOrUrl : pathOrUrl;
}

/** The /hls proxy's master playlist for a channel (rebatv-web/src/lib/hls.ts hlsProxyPath). */
export function hlsUrl(slug: string): string {
  return apiUrl(`/hls/${encodeURIComponent(slug)}/playlist.m3u8`);
}

// fetch() with a timeout. No AbortController: it only arrived in Chrome 66 (webOS 4 is 53).
function getJson<T>(path: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS);
    fetch(apiUrl(path), { credentials: "omit" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(
        (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
  });
}

export function fetchLineup(country: string): Promise<Lineup> {
  return getJson<Lineup>(`/api/v1/lineup/${encodeURIComponent(country.toLowerCase())}`).then((l) => {
    if (!l || !Array.isArray(l.channels)) throw new Error("Unexpected response");
    return l;
  });
}

export function locate(): Promise<Located> {
  return getJson<Located>("/api/v1/locate");
}
