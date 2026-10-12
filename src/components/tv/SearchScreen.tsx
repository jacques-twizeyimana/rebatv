"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { filterChannels, GENRES, parseSearchState, type Group, type SearchState } from "@/lib/search";
import type { LineupChannel, Market } from "@/lib/types";
import { ChannelCard } from "./ChannelCard";
import s from "./search.module.css";

type Props = { channels: LineupChannel[]; market: Market };

const KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const MAX_QUERY = 40;
export const DEFAULT_SEARCH: SearchState = { q: "", genre: "All", group: null };

/** Reads the initial filters from the URL. Must sit inside <Suspense>. */
export function SearchFromUrl(props: Props) {
  const params = useSearchParams();
  return <SearchScreen {...props} initial={parseSearchState(new URLSearchParams(params.toString()))} />;
}

export function SearchScreen({ channels, market, initial = DEFAULT_SEARCH }: Props & { initial?: SearchState }) {
  const [q, setQ] = useState(initial.q);
  const [genre, setGenre] = useState(initial.genre);
  const [group, setGroup] = useState<Group>(initial.group);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterChannels(channels, { q, genre, group }), [channels, q, genre, group]);

  // Keep the URL shareable without a server round-trip (Next syncs history.replaceState).
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (genre !== "All") p.set("genre", genre);
      if (group) p.set("group", group);
      const qs = p.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
    }, 250);
    return () => clearTimeout(t);
  }, [q, genre, group]);

  const type = (ch: string) => setQ((v) => (v + ch).slice(0, MAX_QUERY));
  const del = () => setQ((v) => v.slice(0, -1));

  // Design behaviour: typing anywhere on this screen goes into the query.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement === inputRef.current || document.querySelector("dialog[open]")) return;
      if (e.key.length === 1 && /[\p{L}\p{N} ]/u.test(e.key)) {
        e.preventDefault();
        type(e.key.toLowerCase());
      } else if (e.key === "Backspace") {
        e.preventDefault();
        del();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const trimmed = q.trim();
  const groupName = group === "local" ? market.name : group === "intl" ? "International" : null;
  const title = trimmed ? "Results" : groupName || (genre === "All" ? "All channels" : genre);
  const count = `${results.length} ${results.length === 1 ? "channel" : "channels"} live`;

  return (
    <div className={s.layout}>
      <div className={s.panel}>
        <div className={s.queryBox}>
          <label htmlFor="search-q" className="sr-only">
            Search channels
          </label>
          <input
            ref={inputRef}
            id="search-q"
            className={s.queryInput}
            type="search"
            value={q}
            maxLength={MAX_QUERY}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Channel, genre or country"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-controls="search-results"
            data-nav=""
          />
        </div>

        <div className={s.keys} role="group" aria-label="On-screen keyboard">
          {KEYS.map((k, i) => (
            <button
              key={k}
              type="button"
              className={s.key}
              onClick={() => type(k)}
              aria-label={`Type ${k.toUpperCase()}`}
              data-nav=""
              data-autofocus={i === 0 ? "" : undefined}
            >
              <span className={s.keyLabel} aria-hidden="true">
                {k}
              </span>
            </button>
          ))}
        </div>
        <div className={s.actions}>
          <button type="button" className={s.action} onClick={() => type(" ")} data-nav="">
            Space
          </button>
          <button type="button" className={s.action} onClick={del} data-nav="">
            Delete
          </button>
          <button type="button" className={s.action} onClick={() => setQ("")} data-nav="">
            Clear
          </button>
        </div>

        <div className={s.browse} role="group" aria-labelledby="browse-label">
          <span id="browse-label" className={s.browseLabel}>
            Browse
          </span>
          <div className={s.chips}>
            <button
              type="button"
              className={s.chip}
              aria-pressed={group === "local"}
              onClick={() => setGroup((g) => (g === "local" ? null : "local"))}
              data-nav=""
            >
              {market.name}
            </button>
            <button
              type="button"
              className={s.chip}
              aria-pressed={group === "intl"}
              onClick={() => setGroup((g) => (g === "intl" ? null : "intl"))}
              data-nav=""
            >
              International
            </button>
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                className={s.chip}
                aria-pressed={genre === g}
                onClick={() => setGenre(g)}
                data-nav=""
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={s.results} aria-labelledby="results-title">
        <div className={s.resultsHead}>
          <h2 id="results-title" className={s.resultsTitle}>
            {title}
          </h2>
          <span className={s.resultsCount} role="status" aria-live="polite" aria-atomic="true">
            {count}
          </span>
        </div>
        {results.length === 0 && (
          <p className={s.empty}>
            Nothing matches “{trimmed || genre}”. Try a station name like <strong>TV10</strong>, or a country like{" "}
            <strong>Kenya</strong>.
          </p>
        )}
        <ul id="search-results" className={s.grid}>
          {results.map((c) => (
            <li key={c.id} style={{ minWidth: 0 }}>
              <ChannelCard channel={c} market={market.code} showLive={false} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
