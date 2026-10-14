import { toApiLineup } from "@/lib/api";
import { getCatalog } from "@/lib/data/catalog";
import { marketParams } from "@/lib/data/market";
import { buildLineup, resolveMarket } from "@/lib/lineup";

/**
 * Channel lineup for one market, for the TV apps (rebatv-webos). Prerendered per market from the
 * cached catalogue and refreshed by the same updateTag("catalog") as the pages. A valid code that
 * isn't a market gets the default market with `exact: false` (no redirect: TV apps follow none).
 * CORS is set for /api/v1 in next.config.ts.
 */

const CC_RE = /^[a-z]{2}$/;

export const generateStaticParams = marketParams;

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/lineup/[country]">) {
  const { country } = await ctx.params;
  if (!CC_RE.test(country)) return Response.json({ error: "Unknown country" }, { status: 404 });

  const catalog = await getCatalog();
  const resolved = resolveMarket(catalog, country);
  if (!resolved) return Response.json({ error: "No markets configured" }, { status: 404 });

  const lineup = buildLineup(catalog, resolved.market.code)!;
  return Response.json(toApiLineup(lineup, resolved.exact));
}
