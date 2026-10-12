import "server-only";
import { notFound } from "next/navigation";
import { buildLineup, listMarkets, resolveMarket } from "@/lib/lineup";
import { getCatalog } from "./catalog";

const CC_RE = /^[a-z]{2}$/;

/**
 * Resolves a /[country] segment. Valid two-letter codes that aren't markets (e.g. a visitor
 * geolocated to a country we don't cover) render the default market; `exact` tells metadata
 * to point the canonical there and keep the duplicate out of the index.
 */
export async function loadMarket(country: string) {
  if (!CC_RE.test(country)) notFound();
  const catalog = await getCatalog();
  const resolved = resolveMarket(catalog, country);
  if (!resolved) notFound();
  const lineup = buildLineup(catalog, resolved.market.code)!;
  return { catalog, lineup, exact: resolved.exact };
}

export async function marketParams() {
  const markets = listMarkets(await getCatalog());
  // Cache Components requires at least one param at build time.
  return markets.length ? markets.map((m) => ({ country: m.code })) : [{ country: "rw" }];
}
