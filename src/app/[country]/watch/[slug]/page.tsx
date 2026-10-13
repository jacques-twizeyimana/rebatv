import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Player } from "@/components/tv/Player";
import { getCatalog } from "@/lib/data/catalog";
import { loadMarket } from "@/lib/data/market";
import { listMarkets } from "@/lib/lineup";
import type { Catalog } from "@/lib/types";
import { SITE_NAME, SITE_URL, watchPath } from "@/lib/site";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  const slugs = catalog.channels.map((c) => ({ slug: c.slug }));
  // Cache Components requires at least one param at build time.
  return slugs.length ? slugs : [{ slug: "rwanda-television" }];
}

/** One canonical URL per channel: its own market if it has one, otherwise the default market. */
function canonicalMarket(catalog: Catalog, countryCode: string): string {
  const markets = listMarkets(catalog);
  return (markets.find((m) => m.code === countryCode.toLowerCase()) ?? markets[0])?.code ?? "rw";
}

async function load(params: PageProps<"/[country]/watch/[slug]">["params"]) {
  const { country, slug } = await params;
  const { catalog, lineup } = await loadMarket(country, (code) => watchPath(code, slug));
  const channel = lineup.channels.find((c) => c.slug === slug);
  if (!channel) notFound();
  return { catalog, lineup, channel, canonical: watchPath(canonicalMarket(catalog, channel.countryCode), slug) };
}

export async function generateMetadata({ params }: PageProps<"/[country]/watch/[slug]">): Promise<Metadata> {
  const { channel, canonical } = await load(params);
  const title = `${channel.name} live — watch ${channel.short} online`;
  const description =
    channel.description ||
    `Watch ${channel.name} live and free on ${SITE_NAME}. ${channel.genre} from ${channel.country}, streamed over your home internet.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "video.other", title, description, url: canonical },
  };
}

export default async function WatchPage({ params }: PageProps<"/[country]/watch/[slug]">) {
  const { lineup, channel, canonical } = await load(params);
  const channels = lineup.channels.map(({ id, slug, short, name, num, tag, hue, streamUrl, logoUrl }) => ({
    id,
    slug,
    short,
    name,
    num,
    tag,
    hue,
    streamUrl,
    logoUrl,
  }));

  return (
    <main id="main" data-screen="player">
      <Player key={channel.slug} channels={channels} initialSlug={channel.slug} market={lineup.market.code} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TelevisionChannel",
          name: channel.name,
          alternateName: channel.short,
          url: `${SITE_URL}${canonical}`,
          broadcastChannelId: String(channel.num),
          genre: channel.genre,
          ...(channel.logoUrl ? { image: channel.logoUrl } : {}),
          providesBroadcastService: {
            "@type": "BroadcastService",
            name: channel.name,
            broadcastDisplayName: channel.short,
            areaServed: channel.country,
          },
        }}
      />
    </main>
  );
}
