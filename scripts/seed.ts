/**
 * Seeds the channel catalogue: countries, channels with verified HLS streams and logos, the Rwanda
 * hero and the featured list. Idempotent: existing countries and channels (matched by code / slug)
 * are left untouched, so edits made in /sandberg survive a re-run. The one exception: a seeded
 * channel with no logo yet gets the seed's logo URL.
 *
 *   pnpm db:seed
 *   SEED_RESET=1 pnpm db:seed   # wipe channels, featured and countries first (admins are kept)
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import { channels, countries, featuredChannels } from "../src/db/schema";
import { newId } from "../src/lib/ulid";
import { slugify } from "../src/lib/slug";

// Uganda, Kenya and Tanzania are ready to switch on as markets in /sandberg once they have channels.
const COUNTRIES: { code: string; name: string; isMarket: boolean; sortOrder: number }[] = [
  { code: "RW", name: "Rwanda", isMarket: true, sortOrder: 1 },
  { code: "UG", name: "Uganda", isMarket: false, sortOrder: 2 },
  { code: "KE", name: "Kenya", isMarket: false, sortOrder: 3 },
  { code: "TZ", name: "Tanzania", isMarket: false, sortOrder: 4 },
  { code: "QA", name: "Qatar", isMarket: false, sortOrder: 10 },
  { code: "RU", name: "Russia", isMarket: false, sortOrder: 11 },
];

type SeedChannel = {
  /** Defaults to slugify(name). */
  slug?: string;
  short: string;
  name: string;
  hue: number;
  genre: string;
  country: string;
  description: string;
  streamUrl: string;
  logoUrl: string;
  featured?: boolean;
};

// Order = channel numbers within Rwanda. Hues and genres follow the original design.
// Stream URLs were taken from each broadcaster's official live page (source in the comment).
// Logos are hotlinked: Wikimedia Commons where it has a current logo (durable, freely licensed),
// otherwise the broadcaster's own site.
const CHANNELS: SeedChannel[] = [
  {
    // https://www.rba.co.rw/tv
    short: "RTV",
    name: "Rwanda Television",
    hue: 210,
    genre: "News & general",
    country: "RW",
    description: "Rwanda Broadcasting Agency’s national channel, in Kinyarwanda, English and French.",
    streamUrl: "https://5c46fa289c89f.streamlock.net:443/rtv25/rtv/playlist.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/RTV_LOGO_2014.png",
  },
  {
    // https://www.rba.co.rw/kc2
    short: "KC2",
    name: "KC2",
    hue: 275,
    genre: "Entertainment",
    country: "RW",
    description: "Rwanda Broadcasting Agency’s second channel, in Kinyarwanda.",
    streamUrl: "https://5c46fa289c89f.streamlock.net:443/kc2/kc2/playlist.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/KC2_LOGO_2019.png",
  },
  {
    // https://www.tv1.rw/live
    short: "TV1",
    name: "TV1 Rwanda",
    hue: 350,
    genre: "Entertainment",
    country: "RW",
    description: "Rwandan entertainment channel, in Kinyarwanda.",
    streamUrl: "https://live.tv1.rw/index.m3u8",
    logoUrl: "https://static.wixstatic.com/media/5d2bbd_939383bfc46543ed9853c1bb1b6a3726~mv2.png",
    featured: true,
  },
  {
    // https://radiotv10.rw/tvpage/
    short: "TV10",
    name: "TV10",
    hue: 24,
    genre: "Entertainment",
    country: "RW",
    description: "Rwandan entertainment channel from Radio & TV10, in Kinyarwanda and English.",
    streamUrl: "https://5c46fa289c89f.streamlock.net:443/pub1live/mystream/playlist.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e1/TV10_Rwanda.png",
    featured: true,
  },
  {
    // https://www.btnrwanda.com/page/live/
    short: "BTN",
    name: "BTN TV",
    hue: 165,
    genre: "Entertainment",
    country: "RW",
    description: "Rwandan entertainment channel, in Kinyarwanda.",
    streamUrl: "https://tv.btnrwanda.com:3973/live/btnv2live.m3u8",
    logoUrl: "https://btnrwanda.com/img/bana/btnbana.png",
  },
  {
    // https://www.isibomedia.com/listen/tv
    short: "ISIBO",
    name: "Isibo TV",
    hue: 190,
    genre: "Music & entertainment",
    country: "RW",
    description: "Rwandan music and entertainment channel from Isibo Media, in Kinyarwanda.",
    streamUrl: "https://5c46fa289c89f.streamlock.net/pub2live/myStream/playlist.m3u8",
    logoUrl: "https://www.isibomedia.com/assets/logo.png",
  },
  {
    // https://www.btnrwanda.com/
    slug: "b-plus-tv",
    short: "B+",
    name: "B+ TV",
    hue: 28,
    genre: "Sports & entertainment",
    country: "RW",
    description: "BTN Rwanda’s sports and entertainment channel.",
    streamUrl: "https://tv.btnrwanda.com:3432/live/bpluslive.m3u8",
    logoUrl: "https://btnrwanda.com/img/bana/bplusbana.png",
  },
  {
    // https://www.btnrwanda.com/
    short: "AVR",
    name: "Ahupa Visual Radio",
    hue: 315,
    genre: "Music & entertainment",
    country: "RW",
    description: "Visual radio from BTN Rwanda, with entertainment and non-stop music.",
    streamUrl: "https://tv.btnrwanda.com:3349/live/ahupalive.m3u8",
    logoUrl: "https://btnrwanda.com/img/bana/ahupabana.png",
  },
  {
    // https://www.aljazeera.com/video/live
    short: "AJE",
    name: "Al Jazeera English",
    hue: 36,
    genre: "World news",
    country: "QA",
    description: "International news channel broadcasting from Doha, in English.",
    streamUrl: "https://live-hls-web-aje-gcp.thehlive.com/AJE/index.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Aljazeera_eng.svg",
    featured: true,
  },
  {
    short: "RT",
    name: "RT",
    hue: 85,
    genre: "World news",
    country: "RU",
    description: "Russian state-funded international news channel, in English.",
    streamUrl: "https://rt-glb.rttv.com/dvr/rtnews/playlist.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Russia-today-logo.svg",
  },
];

const HERO: Record<string, [string, string]> = {
  RW: ["Rwanda Television", "Rwanda’s national broadcaster since 1992, in Kinyarwanda, English and French."],
};

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, timezone: "Z" });
  const db = drizzle(conn);

  if (process.env.SEED_RESET === "1") {
    await db.delete(featuredChannels);
    await db.delete(channels);
    await db.delete(countries);
    console.log("Reset: removed featured channels, channels and countries.");
  }

  for (const c of COUNTRIES) {
    await db.insert(countries).values(c).onDuplicateKeyUpdate({ set: { code: c.code } });
  }

  const idsByName = new Map<string, string>();
  let featuredPos = 0;
  for (const [i, c] of CHANNELS.entries()) {
    const slug = c.slug ?? slugify(c.name);
    const [existing] = await db.select({ id: channels.id }).from(channels).where(eq(channels.slug, slug)).limit(1);
    const id = existing?.id ?? newId();
    if (existing) {
      // Fill in a logo only where none is set, so logos chosen in /sandberg are kept.
      await db.update(channels).set({ logoUrl: c.logoUrl }).where(and(eq(channels.id, id), isNull(channels.logoUrl)));
    } else {
      await db.insert(channels).values({
        id,
        slug,
        shortName: c.short,
        name: c.name,
        description: c.description,
        genre: c.genre,
        hue: c.hue,
        countryCode: c.country,
        streamUrl: c.streamUrl,
        logoUrl: c.logoUrl,
        sortOrder: i + 1,
      });
    }
    idsByName.set(c.name, id);
    if (c.featured) {
      await db
        .insert(featuredChannels)
        .values({ channelId: id, position: ++featuredPos })
        .onDuplicateKeyUpdate({ set: { channelId: id } });
    }
  }

  for (const [code, [name, blurb]] of Object.entries(HERO)) {
    const [country] = await db.select().from(countries).where(eq(countries.code, code)).limit(1);
    if (country && !country.heroChannelId) {
      await db
        .update(countries)
        .set({ heroChannelId: idsByName.get(name)!, heroBlurb: blurb })
        .where(eq(countries.code, code));
    }
  }

  console.log(`Seeded ${COUNTRIES.length} countries and ${CHANNELS.length} channels.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
