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
  { code: "XA", name: "Pan-African", isMarket: false, sortOrder: 12 },
  { code: "ZA", name: "South Africa", isMarket: false, sortOrder: 13 },
  { code: "DE", name: "Germany", isMarket: false, sortOrder: 14 },
  { code: "FR", name: "France", isMarket: false, sortOrder: 15 },
  { code: "GB", name: "United Kingdom", isMarket: false, sortOrder: 16 },
  { code: "EU", name: "Europe", isMarket: false, sortOrder: 17 },
  { code: "TR", name: "Türkiye", isMarket: false, sortOrder: 18 },
  { code: "CN", name: "China", isMarket: false, sortOrder: 19 },
  { code: "JP", name: "Japan", isMarket: false, sortOrder: 20 },
  { code: "US", name: "United States", isMarket: false, sortOrder: 21 },
  { code: "ER", name: "Eritrea", isMarket: false, sortOrder: 5 },
  { code: "AE", name: "United Arab Emirates", isMarket: false, sortOrder: 22 },
  { code: "AT", name: "Austria", isMarket: false, sortOrder: 23 },
  { code: "ES", name: "Spain", isMarket: false, sortOrder: 24 },
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
// Logos are hotlinked: Wikimedia Commons where it has a current logo (durable, public domain or
// CC BY-SA), otherwise the broadcaster's own site, otherwise iptv-org's community uploads (imgur).
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

  // International news channels published free by the broadcasters on their own CDNs (checked
  // end to end from Kigali: playlists, segments and CORS). Partner/FAST feeds and restreams are
  // deliberately excluded.
  {
    // https://www.africanews.com/live/
    short: "AFRICA",
    name: "Africanews",
    hue: 18,
    genre: "African news",
    country: "XA",
    description: "Pan-African news channel from the Euronews group, in English.",
    streamUrl: "https://cdn-euronews.akamaized.net/live/eds/africanews-en/25049/index.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Africanews_logo.svg",
    featured: true,
  },
  {
    // https://www.dw.com/en/live-tv/channel-english
    slug: "dw-news",
    short: "DW",
    name: "DW News",
    hue: 215,
    genre: "World news",
    country: "DE",
    description: "Germany’s international broadcaster Deutsche Welle, news in English.",
    streamUrl: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/75/Deutsche_Welle_symbol_2012.svg",
    featured: true,
  },
  {
    // https://www.france24.com/en/live
    short: "F24",
    name: "France 24",
    hue: 205,
    genre: "World news",
    country: "FR",
    description: "French international news channel, in English.",
    streamUrl: "https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_5000.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c1/France_24_logo_%282013%29.svg",
  },
  {
    // https://www.france24.com/fr/direct
    short: "F24 FR",
    name: "France 24 Français",
    hue: 198,
    genre: "World news",
    country: "FR",
    description: "French international news channel, in French.",
    streamUrl: "https://live.france24.com/hls/live/2037179/F24_FR_HI_HLS/master_5000.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c1/France_24_logo_%282013%29.svg",
  },
  {
    // https://www.tv5monde.com/ — segments only allow tv5monde.com, so hls.js can't play them;
    // the player falls back to native HLS (Safari, smart TVs, recent Chrome).
    short: "TV5",
    name: "TV5Monde Info",
    hue: 320,
    genre: "World news",
    country: "FR",
    description: "International French-language news from TV5Monde.",
    streamUrl: "https://ott.tv5monde.com/Content/HLS/Live/channel(info)/variant.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/54/Logo_TV5Monde_2025.svg",
  },
  {
    // https://www.bbc.com/news — BBC's own worldwide stream of the BBC News channel
    short: "BBC",
    name: "BBC News",
    hue: 0,
    genre: "World news",
    country: "GB",
    description: "The BBC News channel, in English.",
    streamUrl: "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/mobile_wifi_main_hd_abr_v2.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a2/BBC_News_2022_%28Alt%29.svg",
  },
  {
    // https://www.euronews.com/live
    short: "EURONEWS",
    name: "Euronews",
    hue: 235,
    genre: "World news",
    country: "EU",
    description: "European news channel, in English.",
    streamUrl: "https://cdn-euronews.akamaized.net/live/eds/euronews-en/25002/index.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Euronews_2022.svg",
  },
  {
    // https://www.trtworld.com/live
    short: "TRT",
    name: "TRT World",
    hue: 350,
    genre: "World news",
    country: "TR",
    description: "Türkiye’s public international news channel, in English.",
    streamUrl: "https://tv-trtworld.medya.trt.com.tr/master.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/27/TRT_World.svg",
  },
  {
    // https://www.cgtn.com/tv
    short: "CGTN",
    name: "CGTN",
    hue: 8,
    genre: "World news",
    country: "CN",
    description: "China’s state-run international news channel, in English.",
    streamUrl: "https://english-livebkali.cgtn.com/live/encgtn.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/81/CGTN.svg",
  },
  {
    // https://www3.nhk.or.jp/nhkworld/en/live/
    short: "NHK",
    name: "NHK World-Japan",
    hue: 340,
    genre: "World news",
    country: "JP",
    description: "Japan’s public international channel, news and culture in English.",
    streamUrl: "https://media-tyo.hls.nhkworld.jp/hls/w/live/master.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/25/NHK_WORLD-JAPAN_logo.svg",
  },
  {
    // https://www.bloomberg.com/live — Europe, Middle East & Africa edition
    short: "BLOOMBERG",
    name: "Bloomberg Television",
    hue: 270,
    genre: "Business news",
    country: "US",
    description: "Business and markets news, in English (Europe, Middle East and Africa edition).",
    streamUrl: "https://www.bloomberg.com/media-manifest/streams/eu.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/66/Bloomberg_Television_logo.svg",
  },
  {
    // https://www.cbsnews.com/live/
    short: "CBS",
    name: "CBS News 24/7",
    hue: 225,
    genre: "World news",
    country: "US",
    description: "US and world news from CBS News, in English.",
    streamUrl: "https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b0/CBS_News_247_logo.svg",
  },
  {
    // https://www.sabcnews.com/sabcnews/live-stream/
    short: "SABC",
    name: "SABC News",
    hue: 28,
    genre: "News & general",
    country: "ZA",
    description: "South Africa’s public broadcaster news channel, in English.",
    streamUrl: "https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/master.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f1/SABC_News_logo_2018.jpg",
  },

  // Discovered via iptv-org (github.com/iptv-org/iptv), kept only where the stream is on the
  // broadcaster's own domain or its streaming provider, and checked end to end from Kigali.
  // East Africa
  {
    // https://www.inooro.co.ke
    short: "INOORO",
    name: "Inooro TV",
    hue: 8,
    genre: "Entertainment",
    country: "KE",
    description: "Kenyan channel from Royal Media Services, in Kikuyu.",
    streamUrl: "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8",
    logoUrl: "https://i.imgur.com/5qFJtmo.png",
  },
  {
    // https://akilikids.co.ke
    slug: "akili-kids",
    short: "AKILI",
    name: "Akili Kids!",
    hue: 48,
    genre: "Kids",
    country: "KE",
    description: "Kenyan free-to-air children’s channel.",
    streamUrl: "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8",
    logoUrl: "https://i.imgur.com/xFm2co6.png",
  },
  {
    // https://www.bukedde.co.ug
    short: "BUKEDDE 1",
    name: "Bukedde TV 1",
    hue: 356,
    genre: "News & general",
    country: "UG",
    description: "Ugandan channel from Vision Group, in Luganda.",
    streamUrl: "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8",
    logoUrl: "https://i.imgur.com/HFq5QlJ.png",
  },
  {
    // https://www.bukedde.co.ug
    short: "BUKEDDE 2",
    name: "Bukedde TV 2",
    hue: 12,
    genre: "Entertainment",
    country: "UG",
    description: "Ugandan entertainment channel from Vision Group, in Luganda.",
    streamUrl: "https://stream.hydeinnovations.com/bukedde2flussonic/index.m3u8",
    logoUrl: "https://i.imgur.com/ukwPZeY.png",
  },
  {
    // https://bbstv.ug
    // No CORS on playlists or segments: plays via the native-HLS fallback (Safari, TVs, recent Chrome).
    short: "BBS",
    name: "BBS TV",
    hue: 32,
    genre: "News & general",
    country: "UG",
    description: "The Buganda Kingdom’s television channel, in Luganda.",
    streamUrl: "https://bbstv.ug/hls/ch01/index.m3u8",
    logoUrl: "https://i.imgur.com/Hub1AXv.png",
  },
  {
    // https://www.visiongroup.co.ug
    short: "TV WEST",
    name: "TV West",
    hue: 122,
    genre: "General",
    country: "UG",
    description: "Western Uganda channel from Vision Group.",
    streamUrl: "https://stream.hydeinnovations.com/tvwest-flussonic/index.m3u8",
    logoUrl: "https://i.imgur.com/EiJzkIz.png",
  },
  {
    // https://www.visiongroup.co.ug
    short: "WAN LUO",
    name: "Wan Luo TV",
    hue: 150,
    genre: "General",
    country: "UG",
    description: "Northern Uganda channel from Vision Group, in Luo.",
    streamUrl: "https://stream.hydeinnovations.com/luotv-flussonic/index.m3u8",
    logoUrl: "https://i.imgur.com/4PUUp3E.png",
  },
  {
    // https://www.tbc.go.tz
    short: "TBC2",
    name: "TBC2",
    hue: 206,
    genre: "Entertainment",
    country: "TZ",
    description: "Tanzania Broadcasting Corporation’s entertainment channel, in Swahili.",
    streamUrl: "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8",
    logoUrl: "https://i.imgur.com/VkUJt2q.png",
  },
  {
    // https://www.shabait.com
    slug: "eri-tv",
    short: "ERI-TV",
    name: "ERi-TV 1",
    hue: 140,
    genre: "News & general",
    country: "ER",
    description: "Eritrea’s national television.",
    streamUrl: "https://jmc-live.ercdn.net/eritreatv/eritreatv.m3u8",
    logoUrl: "https://i.imgur.com/bTR0Huw.png",
  },
  // International
  {
    // https://www.aljazeera.net/live
    short: "AJ ARABIC",
    name: "Al Jazeera Arabic",
    hue: 38,
    genre: "World news",
    country: "QA",
    description: "Al Jazeera’s flagship Arabic news channel.",
    streamUrl: "https://live-hls-web-aja.getaj.net/AJA/index.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Aljazeera_eng.svg",
  },
  {
    // https://www.skynewsarabia.com/live-stream
    short: "SKY ARABIA",
    name: "Sky News Arabia",
    hue: 355,
    genre: "World news",
    country: "AE",
    description: "Arabic-language news channel based in Abu Dhabi.",
    streamUrl: "https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Sky_News_Arabia_2024.svg",
  },
  // Music (Trace's own platform, TRACE+)
  {
    // https://trace.plus
    short: "MZIKI",
    name: "Trace Mziki",
    hue: 4,
    genre: "Music",
    country: "FR",
    description: "Trace’s music channel for East Africa, in Swahili.",
    streamUrl: "https://channels.trace.plus/Traceprod/MZIKI_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/l3X9Gg4.png",
  },
  {
    // https://trace.plus
    short: "KITOKO",
    name: "Trace Kitoko",
    hue: 280,
    genre: "Music",
    country: "FR",
    description: "Trace’s music channel for Central Africa.",
    streamUrl: "https://channels.trace.plus/Traceprod/KITOKO_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/q6vkMrU.png",
  },
  {
    // https://trace.plus
    short: "TRACE AFRICA",
    name: "Trace Africa",
    hue: 20,
    genre: "Music",
    country: "FR",
    description: "Trace’s African music channel (French-speaking edition).",
    streamUrl: "https://channels.trace.plus/Traceprod/AFRICA_FR_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/kPUkoS7.png",
  },
  {
    // https://trace.plus
    short: "NAIJA",
    name: "Trace Naija",
    hue: 110,
    genre: "Music",
    country: "FR",
    description: "Trace’s Nigerian music channel.",
    streamUrl: "https://channels.trace.plus/Traceprod/NAIJA_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/Rguekcp.png",
  },
  {
    // https://trace.plus
    short: "TRACE URBAN",
    name: "Trace Urban",
    hue: 300,
    genre: "Music",
    country: "FR",
    description: "Trace’s urban music channel (African French-speaking edition).",
    streamUrl: "https://channels.trace.plus/Traceprod/URBAN_AFRIC_FR_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/DLIbUMx.png",
  },
  {
    // https://trace.plus
    short: "GOSPEL",
    name: "Trace Gospel",
    hue: 265,
    genre: "Gospel music & religion",
    country: "FR",
    description: "Gospel music from Trace.",
    streamUrl: "https://channels.trace.plus/Traceprod/GOSPEL_ROA_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/X0UmU3K.png",
  },
  // Sports
  {
    // https://trace.plus
    short: "SPORT STARS",
    name: "Trace Sport Stars",
    hue: 195,
    genre: "Sports",
    country: "FR",
    description: "Athletes’ stories and sports lifestyle from Trace.",
    streamUrl: "https://channels.trace.plus/Traceprod/TRACE_SPORT_STARS_hd/index.m3u8",
    logoUrl: "https://i.imgur.com/FabFP5A.png",
  },
  {
    // https://www.redbull.com/int-en/live
    short: "RED BULL",
    name: "Red Bull TV",
    hue: 225,
    genre: "Sports",
    country: "AT",
    description: "Action sports, events and music from Red Bull Media House.",
    streamUrl: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    logoUrl: "https://i.postimg.cc/8c78JM28/image.png",
  },
  {
    // https://www.realmadrid.com/en/rmtv
    slug: "real-madrid-tv",
    short: "RMTV",
    name: "Real Madrid TV",
    hue: 250,
    genre: "Sports",
    country: "ES",
    description: "Real Madrid’s official club channel, in English.",
    streamUrl: "https://rmtv.akamaized.net/hls/live/2043154/rmtv-en-web/master.m3u8",
    logoUrl: "https://i.imgur.com/5pMo7dL.png",
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
