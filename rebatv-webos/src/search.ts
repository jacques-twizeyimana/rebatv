import type { Channel } from "./types";

// Port of rebatv-web/src/lib/search.ts.

export const GENRES = ["All", "News", "Sports", "Music", "Entertainment", "Religion"];
export type Group = "local" | "intl" | null;
export type SearchState = { q: string; genre: string; group: Group };

export function filterChannels(channels: Channel[], { q, genre, group }: SearchState): Channel[] {
  let out = channels;
  if (group === "local") out = out.filter((c) => c.local);
  else if (group === "intl") out = out.filter((c) => !c.local);
  if (genre !== "All") out = out.filter((c) => c.genre.toLowerCase().indexOf(genre.toLowerCase()) >= 0);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length) {
    out = out.filter((c) => {
      const hay = `${c.name} ${c.short} ${c.genre} ${c.country} ${c.num}`.toLowerCase();
      return terms.every((t) => hay.indexOf(t) >= 0);
    });
  }
  return out;
}
