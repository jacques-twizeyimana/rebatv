import { useMemo, useState } from "preact/hooks";
import { ChannelCard, Clock, Logo } from "../components/ui";
import { useKeys } from "../keybus";
import { platform } from "../platform";
import { filterChannels, GENRES, type Group } from "../search";
import type { Lineup } from "../types";

type Props = { lineup: Lineup; active: boolean; onOpen: (slug: string) => void };

const KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const MAX_QUERY = 40;

/** Port of rebatv-web's SearchScreen: on-screen keyboard, browse chips, live results. */
export function Search({ lineup, active, onOpen }: Props) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("All");
  const [group, setGroup] = useState<Group>(null);
  const market = lineup.market;

  const results = useMemo(() => filterChannels(lineup.channels, { q, genre, group }), [lineup, q, genre, group]);

  const type = (ch: string) => setQ((v) => (v + ch).slice(0, MAX_QUERY));
  const del = () => setQ((v) => v.slice(0, -1));

  // A keyboard (or a remote with letters) types straight into the query. Digits stay with the
  // app's channel-number entry. On VIDAA, Backspace is the remote's BACK key, so it isn't "delete".
  useKeys((k, e) => {
    if (e.key && e.key.length === 1 && /[a-z ]/i.test(e.key)) {
      type(e.key.toLowerCase());
      return true;
    }
    if (k && k.action === "backspace" && platform !== "vidaa" && q) {
      del();
      return true;
    }
    return false;
  }, active);

  const trimmed = q.trim();
  const groupName = group === "local" ? market.name : group === "intl" ? "International" : null;
  const title = trimmed ? "Results" : groupName || (genre === "All" ? "All channels" : genre);

  return (
    <div className="screen">
      <header className="header">
        <Logo />
        <span className="spacer" />
        <Clock />
      </header>
      <div className="searchLayout">
        <div className="searchPanel">
          <div className={`queryBox${q ? "" : " empty"}`}>
            {q || "Channel, genre or country"}
            <span className="caret" />
          </div>
          <div className="keys">
            {KEYS.map((k, i) => (
              <button
                key={k}
                type="button"
                className="key"
                data-nav=""
                data-autofocus={i === 0 ? "" : undefined}
                data-focus-key={`key:${k}`}
                onClick={() => type(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="keyActions">
            <button type="button" className="action wide" data-nav="" onClick={() => type(" ")}>
              Space
            </button>
            <button type="button" className="action" data-nav="" onClick={del}>
              Delete
            </button>
            <button type="button" className="action" data-nav="" onClick={() => setQ("")}>
              Clear
            </button>
          </div>
          <div className="browse">
            <span className="browseLabel">Browse</span>
            <div className="chips">
              <button
                type="button"
                className={`chip${group === "local" ? " on" : ""}`}
                data-nav=""
                onClick={() => setGroup((g) => (g === "local" ? null : "local"))}
              >
                {market.name}
              </button>
              <button
                type="button"
                className={`chip${group === "intl" ? " on" : ""}`}
                data-nav=""
                onClick={() => setGroup((g) => (g === "intl" ? null : "intl"))}
              >
                International
              </button>
              {GENRES.map((g) => (
                <button key={g} type="button" className={`chip${genre === g ? " on" : ""}`} data-nav="" onClick={() => setGenre(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="results">
          <div className="resultsHead">
            <h2 className="resultsTitle">{title}</h2>
            <span className="resultsCount">
              {results.length} {results.length === 1 ? "channel" : "channels"} live
            </span>
          </div>
          {results.length === 0 && (
            <p className="emptyNote">
              Nothing matches “{trimmed || genre}”. Try a station name like <strong>TV10</strong>, or a country like{" "}
              <strong>Kenya</strong>.
            </p>
          )}
          <div className="resultsViewport">
            <ul className="resultsGrid" data-vtrack="">
              {results.map((c) => (
                <li key={c.id} className="resultsItem">
                  <ChannelCard channel={c} focusKey={`result:${c.slug}`} onOpen={onOpen} showLive={false} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
