// Serializable shapes shared by server and client code.

export type CatalogChannel = {
  id: string;
  slug: string;
  short: string;
  name: string;
  description: string | null;
  genre: string;
  hue: number;
  countryCode: string;
  streamUrl: string | null;
  logoUrl: string | null;
  sortOrder: number;
};

export type CatalogCountry = {
  code: string;
  name: string;
  isMarket: boolean;
  heroChannelId: string | null;
  heroBlurb: string | null;
  sortOrder: number;
};

export type Catalog = {
  channels: CatalogChannel[];
  countries: CatalogCountry[];
  /** Featured channel ids, in admin-defined order. */
  featured: string[];
};

export type LineupChannel = {
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
  logoUrl: string | null;
};

export type Market = { code: string; name: string; localCount: number };

export type Lineup = {
  market: Market & { heroBlurb: string | null };
  markets: Market[];
  channels: LineupChannel[];
  hero: LineupChannel | null;
  local: LineupChannel[];
  featured: LineupChannel[];
  international: LineupChannel[];
};
