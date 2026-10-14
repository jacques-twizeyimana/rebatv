import type { Lineup } from "./types";

/** localStorage, never trusted to exist or to hold what we wrote (storage can be wiped or full). */

const MARKET = "rtv:market";
const LINEUP = "rtv:lineup";
const FAVS = "rtv:favs"; // same key as the web player
const LAST = "rtv:last";
export const BWE = "rtv:bwe"; // bandwidth estimate, same key as the web player

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

export const getMarket = () => read(MARKET);
export const setMarket = (code: string) => write(MARKET, code);

export const getLastSlug = () => read(LAST);
export const setLastSlug = (slug: string) => write(LAST, slug);

/** Last lineup we loaded, so the app opens instantly and works through a brief outage. */
export function getCachedLineup(): Lineup | null {
  try {
    const l = JSON.parse(read(LINEUP) || "null") as Lineup | null;
    return l && l.version === 1 && Array.isArray(l.channels) ? l : null;
  } catch {
    return null;
  }
}

export const setCachedLineup = (l: Lineup) => write(LINEUP, JSON.stringify(l));

export function getFavs(): string[] {
  try {
    const v = JSON.parse(read(FAVS) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const setFavs = (ids: string[]) => write(FAVS, JSON.stringify(ids));
