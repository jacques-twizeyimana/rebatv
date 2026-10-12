import Link from "next/link";
import { hueVars, searchPath, watchPath } from "@/lib/site";
import type { LineupChannel } from "@/lib/types";
import { LiveBadge } from "./LiveBadge";
import s from "./tv.module.css";

export function Hero({ channel, blurb, market }: { channel: LineupChannel; blurb: string | null; market: string }) {
  const gradient = hueVars(channel.hue);
  return (
    <section className={s.hero} data-top="" aria-labelledby="hero-title">
      <div className={`${s.heroWash} ${s.gradient}`} style={gradient} aria-hidden="true" />
      <div className={s.heroFade} aria-hidden="true" />
      <div className={s.heroCopy}>
        <div className={s.heroMeta}>
          <LiveBadge />
          <span className={s.heroMetaText}>
            CH {channel.num} · {channel.tag}
          </span>
        </div>
        <h2 id="hero-title" className={s.heroTitle}>
          {channel.name}
        </h2>
        {(blurb || channel.description) && <p className={s.heroDesc}>{blurb || channel.description}</p>}
        <div className={s.heroActions}>
          <Link
            href={watchPath(market, channel.slug)}
            className={s.cta}
            data-nav=""
            data-autofocus=""
            data-focus-key="hero:watch"
          >
            <span className={s.playGlyph} aria-hidden="true" />
            <span>
              <span lang="rw">Reba nonaha</span> · Watch live<span className="sr-only">: {channel.name}</span>
            </span>
          </Link>
          <Link href={searchPath(market)} className={s.ctaGhost} data-nav="" data-focus-key="hero:search">
            Find a channel
          </Link>
        </div>
      </div>
      <div className={s.heroMedia} aria-hidden="true">
        <div className={`${s.heroScreen} ${s.gradient}`} style={gradient}>
          <div className={s.scanlines} />
          <div className={s.heroScreenMark}>{channel.short}</div>
          <div className={s.heroScreenNote}>Live stream preview</div>
        </div>
      </div>
    </section>
  );
}
