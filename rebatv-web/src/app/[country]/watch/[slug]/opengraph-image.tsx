import { ImageResponse } from "next/og";
import { OgCard } from "@/components/OgCard";
import { getCatalog } from "@/lib/data/catalog";

export const alt = "Channel preview on rebaTV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ country: string; slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const c = catalog.channels.find((ch) => ch.slug === slug);
  const country = catalog.countries.find((x) => x.code === c?.countryCode)?.name;
  return new ImageResponse(
    <OgCard
      title={c?.name ?? "Live TV"}
      kicker={c ? `${c.genre}${country ? ` · ${country}` : ""}` : "rebaTV"}
      mark={c?.short ?? "TV"}
      hue={c?.hue ?? 46}
    />,
    size,
  );
}
