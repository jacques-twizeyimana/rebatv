import Link from "next/link";
import type { LineupChannel } from "@/lib/types";
import { ChannelCard } from "./ChannelCard";
import s from "./tv.module.css";

type Props = {
  id: string;
  title: string;
  sub: string;
  channels: LineupChannel[];
  market: string;
  seeAllHref?: string;
  limit?: number;
};

export function ChannelRow({ id, title, sub, channels, market, seeAllHref, limit = 5 }: Props) {
  if (channels.length === 0) return null;
  const headingId = `row-${id}`;
  const shown = channels.slice(0, limit);
  return (
    <section className={s.row} data-row="" aria-labelledby={headingId}>
      <div className={`${s.rowHead} ${s.gutter}`}>
        <h2 id={headingId} className={s.rowTitle}>
          {title}
        </h2>
        <span className={s.rowSub}>{sub}</span>
        <span className={s.spacer} />
        {seeAllHref && channels.length > limit && (
          <Link href={seeAllHref} className={s.seeAll} data-nav="" data-focus-key={`${id}:all`}>
            See all {channels.length} <span aria-hidden="true">→</span>
            <span className="sr-only"> {title} channels</span>
          </Link>
        )}
      </div>
      <ul className={`${s.rowGrid} ${s.gutter}`}>
        {shown.map((c) => (
          <li key={c.id} style={{ minWidth: 0 }}>
            <ChannelCard channel={c} market={market} focusKey={`${id}:${c.slug}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
