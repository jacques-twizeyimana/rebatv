import { platform } from "../platform";
import { Clock, Logo } from "../components/ui";
import type { Lineup } from "../types";

type Props = { lineup: Lineup; onPick: (code: string) => void };

export function Settings({ lineup, onPick }: Props) {
  const current = lineup.market.code;
  return (
    <div className="screen">
      <header className="header">
        <Logo />
        <span className="spacer" />
        <Clock />
      </header>
      <div className="settings gutter">
        <h1 className="dialogTitle">Where are you watching from?</h1>
        <p className="dialogText">Local channels come first and are numbered from 1. Every other channel stays available from 101.</p>
        <ul className="options">
          {lineup.markets.map((m) => (
            <li key={m.code}>
              <button
                type="button"
                className="option"
                data-nav=""
                data-autofocus={m.code === current ? "" : undefined}
                onClick={() => onPick(m.code)}
              >
                <span className="optionName">{m.name}</span>
                <span className="optionCount">{m.localCount} local channels</span>
                {m.code === current && <span className="optionMark">Current</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="about">
          rebaTV {__APP_VERSION__} · {platform}
        </p>
      </div>
    </div>
  );
}
