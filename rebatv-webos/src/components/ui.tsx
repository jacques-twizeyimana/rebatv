import { useEffect, useState } from "preact/hooks";
import { apiUrl } from "../api";
import type { Channel } from "../types";

export function hueVars(hue: number): Record<string, string> {
  const h = ((hue % 360) + 360) % 360;
  return { "--h": String(h), "--h2": String((h + 40) % 360), "--h3": String((h + 20) % 360) };
}

const pad = (n: number) => (n < 10 ? "0" : "") + n;

export function Clock({ className = "clock" }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, 60000 - (Date.now() % 60000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
  return <span className={className}>{`${pad(now.getHours())}:${pad(now.getMinutes())}`}</span>;
}

export function LiveBadge({ className = "live" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="liveDot" />
      LIVE
    </span>
  );
}

/** A channel logo on a white tile (most broadcaster logos are drawn for light backgrounds). */
export function ChannelLogo({ src, className = "logoTile" }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className={className}>
      <span className="logoBox">
        <img src={apiUrl(src)} alt="" className="logoImg" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      </span>
    </span>
  );
}

type CardProps = {
  channel: Channel;
  focusKey: string;
  onOpen: (slug: string) => void;
  showLive?: boolean;
  fav?: boolean;
};

export function ChannelCard({ channel: c, focusKey, onOpen, showLive = true, fav = false }: CardProps) {
  return (
    <button type="button" className="card" data-nav="" data-focus-key={focusKey} onClick={() => onOpen(c.slug)}>
      <div className="thumb gradient" style={hueVars(c.hue)}>
        <div className="scanlines" />
        {c.logo ? (
          <div className="thumbLogo">
            <ChannelLogo src={c.logo} />
          </div>
        ) : (
          <div className="badge">{c.short}</div>
        )}
        {showLive && (
          <div className="cardLive">
            <span className="liveDot" />
            LIVE
          </div>
        )}
        <div className="chNum">
          {fav ? "★ " : ""}CH {c.num}
        </div>
      </div>
      <div className="cardText">
        <span className="cardName">{c.name}</span>
        <span className="cardTag">{c.tag}</span>
      </div>
    </button>
  );
}

type RowProps = {
  id: string;
  title: string;
  sub: string;
  channels: Channel[];
  favs: string[];
  onOpen: (slug: string) => void;
};

/** A horizontally sliding row of every channel in a group (see nav.ts data-track). */
export function ChannelRow({ id, title, sub, channels, favs, onOpen }: RowProps) {
  if (channels.length === 0) return null;
  return (
    <section className="row" data-vitem="">
      <div className="rowHead gutter">
        <h2 className="rowTitle">{title}</h2>
        <span className="rowSub">{sub}</span>
      </div>
      <div className="rowViewport">
        <ul className="rowTrack" data-track="">
          {channels.map((c) => (
            <li key={c.id} className="rowItem">
              <ChannelCard channel={c} focusKey={`${id}:${c.slug}`} onOpen={onOpen} fav={favs.indexOf(c.id) >= 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <span>reba</span>
      <span className="logoAccent">TV</span>
    </span>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}
