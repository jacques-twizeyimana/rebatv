import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/tv/Footer";
import { Header } from "@/components/tv/Header";
import { SearchFromUrl, SearchScreen } from "@/components/tv/SearchScreen";
import { loadMarket } from "@/lib/data/market";
import { searchPath } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[country]/search">): Promise<Metadata> {
  const { country } = await params;
  const { lineup } = await loadMarket(country, searchPath);
  const { market, channels } = lineup;
  const title = `Find a channel — ${channels.length} live TV channels`;
  const description = `Search ${channels.length} live TV channels by name, genre or country: local channels from ${market.name}, regional neighbours and world news.`;
  return {
    title,
    description,
    alternates: { canonical: searchPath(market.code) },
    openGraph: { title, description, url: searchPath(market.code) },
  };
}

export default async function SearchPage({ params }: PageProps<"/[country]/search">) {
  const { country } = await params;
  const { lineup } = await loadMarket(country, searchPath);
  const { market, markets, channels } = lineup;

  return (
    <>
      <Header market={market} markets={markets} active="search" />
      <main id="main" data-screen="search" tabIndex={-1} style={{ outline: "none" }}>
        <h1 className="sr-only">Find a channel</h1>
        {/* The fallback is the unfiltered list, so the static HTML is complete and crawlable. */}
        <Suspense fallback={<SearchScreen channels={channels} market={market} />}>
          <SearchFromUrl channels={channels} market={market} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
