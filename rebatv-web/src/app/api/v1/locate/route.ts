import { headers } from "next/headers";
import { getCatalog } from "@/lib/data/catalog";
import { resolveMarket } from "@/lib/lineup";

/**
 * The visitor's country (Cloudflare's CF-IPCountry, or Vercel's header) and the market it maps to,
 * so a TV app can pick a lineup on first launch. Per-visitor: never cached.
 */

const CC_RE = /^[a-z]{2}$/;

export async function GET() {
  const h = await headers();
  const geo = (h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || "").toLowerCase();
  const country = CC_RE.test(geo) ? geo : null;
  const resolved = resolveMarket(await getCatalog(), country ?? "");
  return Response.json(
    { country, market: resolved?.market.code ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
