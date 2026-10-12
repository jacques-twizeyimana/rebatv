import { ImageResponse } from "next/og";
import { OgCard } from "@/components/OgCard";
import { SITE_TAGLINE } from "@/lib/site";

export const alt = "rebaTV — free live TV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgCard title="Live TV, no antenna" kicker={SITE_TAGLINE} mark="TV" hue={46} />, size);
}
