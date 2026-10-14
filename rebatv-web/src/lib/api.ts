import { isOptimizableLogo } from "./logo";
import type { Lineup, LineupChannel, Market } from "./types";

/**
 * Public JSON shape served at /api/v1/lineup/{cc} for the TV apps (rebatv-webos). Versioned:
 * change it only in backwards-compatible ways, since installed TV apps update slowly.
 */
export const API_VERSION = 1;

/** Width of the optimized logo the TV apps load (must be in next.config.ts image sizes). */
const LOGO_WIDTH = 256;

export type ApiChannel = Omit<LineupChannel, "logoUrl"> & {
  /** Logo to display: a same-origin optimized path (`/_next/image?…`) or an absolute https URL. */
  logo: string | null;
};

export type ApiLineup = {
  version: number;
  /** False when the requested country isn't a market and the default market was served instead. */
  exact: boolean;
  market: Market & { heroBlurb: string | null };
  markets: Market[];
  /** Channel id of the hero, if any. */
  hero: string | null;
  /** Channel ids per home row, in display order. */
  rows: { local: string[]; featured: string[]; international: string[] };
  /** Every channel once, in lineup (channel number) order. */
  channels: ApiChannel[];
};

export function apiLogo(src: string | null): string | null {
  if (!src) return null;
  if (!isOptimizableLogo(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${LOGO_WIDTH}&q=75`;
}

export function toApiLineup(lineup: Lineup, exact: boolean): ApiLineup {
  const ids = (list: LineupChannel[]) => list.map((c) => c.id);
  return {
    version: API_VERSION,
    exact,
    market: lineup.market,
    markets: lineup.markets,
    hero: lineup.hero?.id ?? null,
    rows: { local: ids(lineup.local), featured: ids(lineup.featured), international: ids(lineup.international) },
    channels: lineup.channels.map(({ logoUrl, ...c }) => ({ ...c, logo: apiLogo(logoUrl) })),
  };
}
