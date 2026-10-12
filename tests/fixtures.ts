import type { Catalog, CatalogChannel } from "@/lib/types";

let n = 0;
export function ch(name: string, countryCode: string, extra: Partial<CatalogChannel> = {}): CatalogChannel {
  n++;
  return {
    id: `ID${String(n).padStart(24, "0")}`,
    slug: name.toLowerCase().replace(/\W+/g, "-"),
    short: name.slice(0, 4).toUpperCase(),
    name,
    description: null,
    genre: "Entertainment",
    hue: 100,
    countryCode,
    streamUrl: null,
    logoUrl: null,
    sortOrder: n,
    ...extra,
  };
}

export function catalog(): Catalog {
  const channels = [
    ch("RTV", "RW", { genre: "News & general" }),
    ch("TV10", "RW"),
    ch("Isango", "RW", { genre: "Sports & general" }),
    ch("TV1", "RW"),
    ch("NTV Uganda", "UG", { genre: "News & general" }),
    ch("Citizen", "KE", { genre: "News & general" }),
    ch("Al Jazeera", "QA", { genre: "World news" }),
    ch("DW", "DE", { genre: "World news" }),
  ];
  const id = (name: string) => channels.find((c) => c.name === name)!.id;
  return {
    channels,
    countries: [
      { code: "RW", name: "Rwanda", isMarket: true, heroChannelId: id("RTV"), heroBlurb: "National broadcaster", sortOrder: 1 },
      { code: "UG", name: "Uganda", isMarket: true, heroChannelId: null, heroBlurb: null, sortOrder: 2 },
      { code: "KE", name: "Kenya", isMarket: true, heroChannelId: null, heroBlurb: null, sortOrder: 3 },
      { code: "QA", name: "Qatar", isMarket: false, heroChannelId: null, heroBlurb: null, sortOrder: 10 },
      { code: "DE", name: "Germany", isMarket: false, heroChannelId: null, heroBlurb: null, sortOrder: 11 },
    ],
    featured: [id("DW"), id("TV10"), id("Isango"), id("TV1"), id("Citizen"), id("Al Jazeera")],
  };
}
