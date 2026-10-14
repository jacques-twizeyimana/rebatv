import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data/catalog";
import { listMarkets } from "@/lib/lineup";
import { marketPath, searchPath, SITE_URL, watchPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const markets = listMarkets(catalog);
  const fallback = markets[0]?.code ?? "rw";
  const entries: MetadataRoute.Sitemap = [];

  for (const m of markets) {
    entries.push({ url: `${SITE_URL}${marketPath(m.code)}`, changeFrequency: "daily", priority: 1 });
    entries.push({ url: `${SITE_URL}${searchPath(m.code)}`, changeFrequency: "weekly", priority: 0.6 });
  }
  // Only canonical watch URLs: each channel under its own market, or the default market.
  for (const c of catalog.channels) {
    const own = markets.find((m) => m.code === c.countryCode.toLowerCase())?.code ?? fallback;
    entries.push({ url: `${SITE_URL}${watchPath(own, c.slug)}`, changeFrequency: "weekly", priority: 0.8 });
  }
  return entries;
}
