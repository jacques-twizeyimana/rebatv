import Link from "next/link";
import { marketPath, searchPath } from "@/lib/site";
import type { Market } from "@/lib/types";
import { Clock } from "./Clock";
import { LocationPicker } from "./LocationPicker";
import s from "./tv.module.css";

type Props = { market: Market; markets: Market[]; active: "home" | "search" };

export function Header({ market, markets, active }: Props) {
  return (
    <header className={s.header} data-top="">
      <Link href={marketPath(market.code)} className={s.logo} aria-label="rebaTV home" data-home="">
        <span>reba</span>
        <span className={s.logoAccent}>TV</span>
      </Link>
      <nav className={s.nav} aria-label="Main">
        <Link
          href={marketPath(market.code)}
          className={`${s.pill} ${active === "home" ? s.pillActive : ""}`}
          aria-current={active === "home" ? "page" : undefined}
          data-nav=""
        >
          Home
        </Link>
        <Link
          href={searchPath(market.code)}
          className={`${s.pill} ${active === "search" ? s.pillActive : ""}`}
          aria-current={active === "search" ? "page" : undefined}
          data-nav=""
        >
          <span className={s.searchGlyph} aria-hidden="true" />
          Search
        </Link>
      </nav>
      <span className={s.spacer} />
      <LocationPicker current={market} markets={markets} />
      <Clock className={s.clock} />
    </header>
  );
}
