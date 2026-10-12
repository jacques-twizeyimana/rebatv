import type { Metadata } from "next";
import { ChannelRow } from "@/components/tv/ChannelRow";
import { Footer } from "@/components/tv/Footer";
import { Header } from "@/components/tv/Header";
import { Hero } from "@/components/tv/Hero";
import { JsonLd } from "@/components/JsonLd";
import { loadMarket } from "@/lib/data/market";
import { marketPath, searchPath, SITE_NAME, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[country]">): Promise<Metadata> {
  const { country } = await params;
  const { lineup, exact } = await loadMarket(country);
  const { market, local } = lineup;
  const names = local.slice(0, 4).map((c) => c.name).join(", ");
  const title = `Live TV in ${market.name} — watch local channels free`;
  const description = `Watch ${local.length} TV channels from ${market.name} live${names ? `, including ${names},` : ""} plus world news. Streams over your home internet, no antenna needed.`;
  return {
    title: { absolute: `${title} · ${SITE_NAME}` },
    description,
    alternates: { canonical: marketPath(market.code) },
    robots: exact ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: marketPath(market.code) },
  };
}

export default async function HomePage({ params }: PageProps<"/[country]">) {
  const { country } = await params;
  const { lineup } = await loadMarket(country);
  const { market, markets, hero, local, featured, international } = lineup;
  const code = market.code;

  return (
    <>
      <Header market={market} markets={markets} active="home" />
      <main id="main" data-screen="home" tabIndex={-1} style={{ outline: "none" }}>
        <h1 className="sr-only">Live TV channels in {market.name}</h1>
        {hero && <Hero channel={hero} blurb={market.heroBlurb} market={code} />}
        <ChannelRow
          id="local"
          title={`Local · ${market.name}`}
          sub={`${local.length} channels from ${market.name}`}
          channels={local}
          market={code}
          seeAllHref={`${searchPath(code)}?group=local`}
        />
        <ChannelRow id="featured" title="Featured" sub="Picked by the rebaTV team" channels={featured} market={code} />
        <ChannelRow
          id="intl"
          title="International"
          sub="World news and regional neighbours"
          channels={international}
          market={code}
          seeAllHref={`${searchPath(code)}?group=intl`}
        />
      </main>
      <Footer />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: `${SITE_URL}${marketPath(code)}`,
          inLanguage: "en",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}${searchPath(code)}?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </>
  );
}
