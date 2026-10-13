import "server-only";
import { notFound, redirect } from "next/navigation";
import { buildLineup, listMarkets, resolveMarket } from "@/lib/lineup";
import { getCatalog } from "./catalog";

const CC_RE = /^[a-z]{2}$/;

/**
 * Resolves a /[country] segment. A valid two-letter code that isn't a market (e.g. a visitor
 * geolocated to a country we don't cover) redirects to the same page in the default market;
 * `pathFor` builds that page's path for a market code. The redirect is temporary (307) because
 * an admin can turn the country into a market later.
 */
export async function loadMarket(country: string, pathFor: (code: string) => string) {
  if (!CC_RE.test(country)) notFound();
  const catalog = await getCatalog();
  const resolved = resolveMarket(catalog, country);
  if (!resolved) notFound();
  if (!resolved.exact) redirect(pathFor(resolved.market.code));
  const lineup = buildLineup(catalog, resolved.market.code)!;
  return { catalog, lineup, exact: resolved.exact };
}

export async function marketParams() {
  const markets = listMarkets(await getCatalog());
  // Cache Components requires at least one param at build time.
  return markets.length ? markets.map((m) => ({ country: m.code })) : [{ country: "rw" }];
}
