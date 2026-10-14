import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels, countries, featuredChannels } from "@/db/schema";

// Admin reads are never cached: they always reflect the database.

export async function adminChannels() {
  const [rows, featured] = await Promise.all([
    db
      .select({
        id: channels.id,
        slug: channels.slug,
        shortName: channels.shortName,
        name: channels.name,
        genre: channels.genre,
        hue: channels.hue,
        countryCode: channels.countryCode,
        countryName: countries.name,
        streamUrl: channels.streamUrl,
        sortOrder: channels.sortOrder,
        isActive: channels.isActive,
        updatedAt: channels.updatedAt,
      })
      .from(channels)
      .innerJoin(countries, eq(countries.code, channels.countryCode))
      .orderBy(asc(countries.sortOrder), asc(channels.sortOrder), asc(channels.name)),
    db.select({ id: featuredChannels.channelId }).from(featuredChannels),
  ]);
  const featuredSet = new Set(featured.map((f) => f.id));
  return rows.map((r) => ({ ...r, featured: featuredSet.has(r.id) }));
}

export async function adminChannel(id: string) {
  const [row] = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
  return row ?? null;
}

export async function adminCountries() {
  return db.select().from(countries).orderBy(asc(countries.sortOrder), asc(countries.name));
}

export async function adminGenres(): Promise<string[]> {
  const rows = await db.selectDistinct({ genre: channels.genre }).from(channels).orderBy(asc(channels.genre));
  return rows.map((r) => r.genre);
}

export async function adminFeatured() {
  return db
    .select({
      id: channels.id,
      name: channels.name,
      shortName: channels.shortName,
      hue: channels.hue,
      countryName: countries.name,
      isActive: channels.isActive,
      position: featuredChannels.position,
    })
    .from(featuredChannels)
    .innerJoin(channels, eq(channels.id, featuredChannels.channelId))
    .innerJoin(countries, eq(countries.code, channels.countryCode))
    .orderBy(asc(featuredChannels.position));
}
