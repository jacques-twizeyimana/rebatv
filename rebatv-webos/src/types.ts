// Shapes served by rebatv-web's /api/v1 (see rebatv-web/src/lib/api.ts). Keep in sync.

export type Market = { code: string; name: string; localCount: number };

export type Channel = {
  id: string;
  slug: string;
  short: string;
  name: string;
  description: string | null;
  genre: string;
  hue: number;
  countryCode: string;
  country: string;
  /** Channel number in this market's lineup: locals 1…n, everything else from 101. */
  num: number;
  local: boolean;
  featured: boolean;
  tag: string;
  streamUrl: string | null;
  /** Same-origin path on rebatv-web (`/_next/image?…`) or an absolute https URL. */
  logo: string | null;
};

export type Lineup = {
  version: number;
  exact: boolean;
  market: Market & { heroBlurb: string | null };
  markets: Market[];
  hero: string | null;
  rows: { local: string[]; featured: string[]; international: string[] };
  channels: Channel[];
};

export type Located = { country: string | null; market: string | null };
