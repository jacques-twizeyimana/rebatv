import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db/client";
import { channels, countries, featuredChannels } from "@/db/schema";
import { buildLineup } from "@/lib/lineup";
import type { Catalog } from "@/lib/types";

export const CATALOG_TAG = "catalog";

/**
 * Everything the public site needs, in one cached read. The catalogue is tiny (tens of rows)
 * and rarely changes, so it is cached for a long time and invalidated on every admin edit
 * via updateTag(CATALOG_TAG).
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("catalog");

  const [channelRows, countryRows, featuredRows] = await Promise.all([
    db
      .select({
        id: channels.id,
        slug: channels.slug,
        short: channels.shortName,
        name: channels.name,
        description: channels.description,
        genre: channels.genre,
        hue: channels.hue,
        countryCode: channels.countryCode,
        streamUrl: channels.streamUrl,
        logoUrl: channels.logoUrl,
        sortOrder: channels.sortOrder,
      })
      .from(channels)
      .where(eq(channels.isActive, true))
      .orderBy(asc(channels.sortOrder), asc(channels.name)),
    db.select().from(countries).orderBy(asc(countries.sortOrder)),
    db
      .select({ id: featuredChannels.channelId })
      .from(featuredChannels)
      .innerJoin(channels, eq(channels.id, featuredChannels.channelId))
      .where(eq(channels.isActive, true))
      .orderBy(asc(featuredChannels.position)),
  ]);

  return {
    channels: channelRows,
    countries: countryRows.map((c) => ({
      code: c.code,
      name: c.name,
      isMarket: c.isMarket,
      heroChannelId: c.heroChannelId,
      heroBlurb: c.heroBlurb,
      sortOrder: c.sortOrder,
    })),
    featured: featuredRows.map((f) => f.id),
  };
}

export async function getLineup(code: string) {
  return buildLineup(await getCatalog(), code);
}
