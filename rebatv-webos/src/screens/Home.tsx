import { ChannelRow, Clock, hueVars, LiveBadge, Logo } from "../components/ui";
import type { Channel, Lineup } from "../types";

type Props = {
  lineup: Lineup;
  byId: Record<string, Channel>;
  favs: string[];
  onOpen: (slug: string) => void;
  onSearch: () => void;
  onSettings: () => void;
};

const pick = (byId: Record<string, Channel>, ids: string[]) => ids.map((id) => byId[id]).filter(Boolean);

export function Home({ lineup, byId, favs, onOpen, onSearch, onSettings }: Props) {
  const { market } = lineup;
  const hero = (lineup.hero && byId[lineup.hero]) || lineup.channels[0];
  const local = pick(byId, lineup.rows.local);
  const featured = pick(byId, lineup.rows.featured);
  const intl = pick(byId, lineup.rows.international);
  const saved = lineup.channels.filter((c) => favs.indexOf(c.id) >= 0);

  return (
    <div className="screen">
      <div className="page" data-vtrack="align">
        <header className="header" data-top="">
          <Logo />
          <span className="spacer" />
          <button type="button" className="pill" data-nav="" data-focus-key="nav:search" onClick={onSearch}>
            <span className="searchGlyph" />
            Search
          </button>
          <button type="button" className="locButton" data-nav="" data-focus-key="nav:country" onClick={onSettings}>
            <span className="pin" />
            <span className="locName">{market.name}</span>
            <span className="locChange">Change</span>
          </button>
          <Clock />
        </header>

        {hero && (
          <section className="hero" data-top="">
            <div className="fill heroWash gradient" style={hueVars(hero.hue)} />
            <div className="fill heroFade" />
            <div className="heroCopy">
              <div className="heroMeta">
                <LiveBadge />
                <span className="heroMetaText">
                  CH {hero.num} · {hero.tag}
                </span>
              </div>
              <h1 className="heroTitle">{hero.name}</h1>
              {(market.heroBlurb || hero.description) && <p className="heroDesc">{market.heroBlurb || hero.description}</p>}
              <div className="heroActions">
                <button
                  type="button"
                  className="cta"
                  data-nav=""
                  data-autofocus=""
                  data-focus-key="hero:watch"
                  onClick={() => onOpen(hero.slug)}
                >
                  <span className="playGlyph" />
                  <span>Reba nonaha · Watch live</span>
                </button>
                <button type="button" className="cta ctaGhost" data-nav="" data-focus-key="hero:search" onClick={onSearch}>
                  Find a channel
                </button>
              </div>
            </div>
            <div className="heroMedia">
              <div className="heroScreen gradient" style={hueVars(hero.hue)}>
                <div className="scanlines" />
                <div className="fill heroScreenMark">{hero.short}</div>
              </div>
            </div>
          </section>
        )}

        <ChannelRow id="favs" title="Saved" sub="Your favourite channels" channels={saved} favs={favs} onOpen={onOpen} />
        <ChannelRow
          id="local"
          title={`Local · ${market.name}`}
          sub={`${local.length} channels from ${market.name}`}
          channels={local}
          favs={favs}
          onOpen={onOpen}
        />
        <ChannelRow id="featured" title="Featured" sub="Picked by the rebaTV team" channels={featured} favs={favs} onOpen={onOpen} />
        <ChannelRow
          id="intl"
          title="International"
          sub="World news and regional neighbours"
          channels={intl}
          favs={favs}
          onOpen={onOpen}
        />

        <footer className="footer" data-vitem="">
          <span className="hint">
            <span className="key">◀ ▲ ▼ ▶</span> Move
          </span>
          <span className="hint">
            <span className="key">OK</span> Watch
          </span>
          <span className="hint">
            <span className="key">0–9</span> Go to channel
          </span>
          <span className="hint">
            <span className="key">BACK</span> Return
          </span>
          <span className="spacer" />
          <span>Streams over your home internet · No antenna needed</span>
        </footer>
      </div>
    </div>
  );
}
