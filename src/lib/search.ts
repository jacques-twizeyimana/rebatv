import type { LineupChannel } from "./types";

export const GENRES = ["All", "News", "Sports", "Music", "Entertainment", "Religion"] as const;
export type Group = "local" | "intl" | null;

export type SearchState = { q: string; genre: string; group: Group };

export function parseSearchState(params: URLSearchParams): SearchState {
  const group = params.get("group");
  const genre = params.get("genre") ?? "All";
  return {
    q: (params.get("q") ?? "").slice(0, 40),
    genre: (GENRES as readonly string[]).includes(genre) ? genre : "All",
    group: group === "local" || group === "intl" ? group : null,
  };
}

export function filterChannels(channels: LineupChannel[], { q, genre, group }: SearchState): LineupChannel[] {
  let out = channels;
  if (group === "local") out = out.filter((c) => c.local);
  else if (group === "intl") out = out.filter((c) => !c.local);
  if (genre !== "All") out = out.filter((c) => c.genre.toLowerCase().includes(genre.toLowerCase()));
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length) {
    out = out.filter((c) => {
      const hay = `${c.name} ${c.short} ${c.genre} ${c.country} ${c.num}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  return out;
}
