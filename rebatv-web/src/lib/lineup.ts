import type { Catalog, CatalogChannel, Lineup, LineupChannel, Market } from "./types";

export const INTERNATIONAL_START = 101;
export const FEATURED_ROW_SIZE = 5;
export const FEATURED_LOCAL_MAX = 2;

const bySort = (a: CatalogChannel, b: CatalogChannel) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function listMarkets(catalog: Catalog): Market[] {
  return catalog.countries
    .filter((c) => c.isMarket)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((c) => ({
      code: c.code.toLowerCase(),
      name: c.name,
      localCount: catalog.channels.filter((ch) => ch.countryCode === c.code).length,
    }));
}

/** The market a URL segment resolves to, or the default (first) market for unknown codes. */
export function resolveMarket(catalog: Catalog, code: string): { market: Market; exact: boolean } | null {
  const markets = listMarkets(catalog);
  if (markets.length === 0) return null;
  const exact = markets.find((m) => m.code === code.toLowerCase());
  return { market: exact ?? markets[0], exact: Boolean(exact) };
}

/**
 * Port of the design's lineup(): local channels first (numbered 1…n), then international
 * (non-market countries), then regional neighbours (other markets), numbered from 101.
 */
export function buildLineup(catalog: Catalog, marketCode: string): Lineup | null {
  const resolved = resolveMarket(catalog, marketCode);
  if (!resolved) return null;
  const { market } = resolved;
  const code = market.code.toUpperCase();
  const countries = new Map(catalog.countries.map((c) => [c.code, c]));
  const featuredRank = new Map(catalog.featured.map((id, i) => [id, i]));
  const isMarket = (cc: string) => countries.get(cc)?.isMarket ?? false;

  const sorted = [...catalog.channels].sort(bySort);
  const local = sorted.filter((c) => c.countryCode === code);
  const intl = sorted.filter((c) => c.countryCode !== code && !isMarket(c.countryCode));
  const region = sorted.filter((c) => c.countryCode !== code && isMarket(c.countryCode));

  const toLineup = (c: CatalogChannel, num: number, isLocal: boolean): LineupChannel => {
    const country = countries.get(c.countryCode)?.name ?? c.countryCode;
    return {
      id: c.id,
      slug: c.slug,
      short: c.short,
      name: c.name,
      description: c.description,
      genre: c.genre,
      hue: c.hue,
      countryCode: c.countryCode,
      country,
      num,
      local: isLocal,
      featured: featuredRank.has(c.id),
      tag: isLocal ? c.genre : `${c.genre} · ${country}`,
      streamUrl: c.streamUrl,
      logoUrl: c.logoUrl,
    };
  };

  const localL = local.map((c, i) => toLineup(c, i + 1, true));
  const otherL = intl.concat(region).map((c, i) => toLineup(c, INTERNATIONAL_START + i, false));
  const channels = localL.concat(otherL);

  const rank = (c: LineupChannel) => featuredRank.get(c.id) ?? Number.MAX_SAFE_INTEGER;
  const featured = localL
    .filter((c) => c.featured)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, FEATURED_LOCAL_MAX)
    .concat(otherL.filter((c) => c.featured).sort((a, b) => rank(a) - rank(b)))
    .slice(0, FEATURED_ROW_SIZE);

  const country = countries.get(code);
  const hero =
    channels.find((c) => c.id === country?.heroChannelId) ?? localL[0] ?? channels[0] ?? null;

  return {
    market: { ...market, heroBlurb: country?.heroBlurb ?? null },
    markets: listMarkets(catalog),
    channels,
    hero,
    local: localL,
    featured,
    international: otherL,
  };
}

/** Channel reached by CH+ (dir = 1) or CH− (dir = -1), wrapping around the lineup. */
export function zapTarget<T extends { slug: string }>(list: T[], slug: string, dir: 1 | -1): T | undefined {
  if (list.length === 0) return undefined;
  const i = Math.max(0, list.findIndex((c) => c.slug === slug));
  return list[(i + dir + list.length) % list.length];
}
