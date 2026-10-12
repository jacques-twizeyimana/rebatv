import Link from "next/link";
import { hueVars, watchPath } from "@/lib/site";
import type { LineupChannel } from "@/lib/types";
import s from "./tv.module.css";

type Props = {
  channel: LineupChannel;
  market: string;
  /** Stable key used to restore focus when returning to Home (rows can repeat a channel). */
  focusKey?: string;
  showLive?: boolean;
  headingLevel?: "h3" | "p";
};

export function ChannelCard({ channel: c, market, focusKey, showLive = true, headingLevel = "h3" }: Props) {
  const Name = headingLevel;
  return (
    <Link href={watchPath(market, c.slug)} className={s.card} data-nav="" data-focus-key={focusKey}>
      <div className={`${s.thumb} ${s.gradient}`} style={hueVars(c.hue)} aria-hidden="true">
        <div className={s.scanlines} />
        {c.logoUrl ? (
          <div className={s.thumbLogo}>
            {/* External, admin-provided logo URLs: plain <img> so arbitrary hosts work without an optimizer allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.logoUrl} alt="" width={160} height={90} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className={s.badge}>{c.short}</div>
        )}
        {showLive && (
          <div className={s.cardLive}>
            <span className={s.liveDot} />
            LIVE
          </div>
        )}
        <div className={s.chNum}>CH {c.num}</div>
      </div>
      <div className={s.cardText}>
        <Name className={s.cardName} style={{ margin: 0 }}>
          {c.name}
        </Name>
        <span className={s.cardTag}>
          {c.tag}
          <span className="sr-only">
            {`, channel ${c.num}`}
            {showLive ? ", live now" : ""}
          </span>
        </span>
      </div>
    </Link>
  );
}
