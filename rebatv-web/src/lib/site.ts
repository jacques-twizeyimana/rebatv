import type { CSSProperties } from "react";

export const SITE_NAME = "rebaTV";
export const SITE_TAGLINE = "Free live TV from East Africa and the world";
export const SITE_DESCRIPTION =
  "Watch Rwandan, Ugandan, Kenyan and Tanzanian TV channels live, plus world news, streamed over your home internet. No antenna needed.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const COUNTRY_COOKIE = "rtv_country";
export const GEO_COOKIE = "rtv_geo";
export const SESSION_COOKIE = "rtv_admin";

export const marketPath = (code: string) => `/${code}`;
export const searchPath = (code: string) => `/${code}/search`;
export const watchPath = (code: string, slug: string) => `/${code}/watch/${slug}`;

/** CSS custom properties for the design's per-channel gradient. */
export function hueVars(hue: number): CSSProperties {
  const h = ((hue % 360) + 360) % 360;
  return { "--h": h, "--h2": (h + 40) % 360, "--h3": (h + 20) % 360 } as CSSProperties;
}
