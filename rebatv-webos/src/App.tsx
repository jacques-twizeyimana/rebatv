import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { fetchLineup, locate } from "./api";
import { Logo, Spinner } from "./components/ui";
import { dispatchKey, useKeys } from "./keybus";
import { keyAction, type Action } from "./keys";
import { autofocus, move, type Dir } from "./nav";
import { createNumberEntry } from "./numberEntry";
import { exitApp, platform } from "./platform";
import { Home } from "./screens/Home";
import { Player } from "./screens/Player";
import { Search } from "./screens/Search";
import { Settings } from "./screens/Settings";
import * as store from "./store";
import type { Channel, Lineup } from "./types";

type Route = { name: "home" } | { name: "search" } | { name: "settings" } | { name: "player"; slug: string };
/** A screen on the stack, plus the element that was focused when the next screen opened. */
type Entry = { route: Route; focusKey: string | null };

const ARROWS: Partial<Record<Action, Dir>> = { up: "u", down: "d", left: "l", right: "r" };
const DEFAULT_MARKET = "rw";
// Refresh the lineup when the app comes back to the foreground after this long.
const STALE_MS = 30 * 60 * 1000;

function activeFocusKey(): string | null {
  const el = document.activeElement as HTMLElement | null;
  return el ? el.getAttribute("data-focus-key") : null;
}

export function App() {
  const [lineup, setLineup] = useState<Lineup | null>(() => store.getCachedLineup());
  const [loadError, setLoadError] = useState(false);
  const [stack, setStack] = useState<Entry[]>([{ route: { name: "home" }, focusKey: null }]);
  const [favs, setFavs] = useState<string[]>(() => store.getFavs());
  const [digits, setDigits] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const screensRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);
  const loadedAt = useRef(0);
  const focusBeforeDialog = useRef<HTMLElement | null>(null);

  const top = stack[stack.length - 1];
  const byId = useMemo(() => {
    const map: Record<string, Channel> = {};
    if (lineup) lineup.channels.forEach((c) => (map[c.id] = c));
    return map;
  }, [lineup]);

  // ── Lineup: cached copy first, then the network ─────────────────────────────
  const load = useCallback((code?: string) => {
    setLoadError(false);
    const cached = store.getCachedLineup();
    const pick = code || store.getMarket() || (cached && cached.market.code);
    const country = pick
      ? Promise.resolve(pick)
      : locate().then(
          (l) => l.market || DEFAULT_MARKET,
          () => DEFAULT_MARKET,
        );
    return country
      .then((cc) => fetchLineup(cc))
      .then((l) => {
        loadedAt.current = Date.now();
        store.setCachedLineup(l);
        setLineup(l);
      })
      .catch(() => {
        if (!store.getCachedLineup()) setLoadError(true);
      });
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (!document.hidden && Date.now() - loadedAt.current > STALE_MS) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // ── Navigation stack ────────────────────────────────────────────────────────
  const push = useCallback((route: Route) => {
    const focusKey = activeFocusKey();
    setStack((s) => {
      const copy = s.slice();
      copy[copy.length - 1] = { route: copy[copy.length - 1].route, focusKey };
      return copy.concat({ route, focusKey: null });
    });
  }, []);

  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const openChannel = useCallback(
    (slug: string) => {
      store.setLastSlug(slug);
      if (top.route.name === "player") setStack((s) => s.slice(0, -1).concat({ route: { name: "player", slug }, focusKey: null }));
      else push({ name: "player", slug });
    },
    [top, push],
  );

  // Restore focus whenever the top screen changes (new screen: autofocus; back: last focus).
  const topKey = stack.length + ":" + top.route.name;
  useEffect(() => {
    if (!lineup || exitOpen) return;
    const screens = screensRef.current;
    const el = screens && (screens.lastElementChild as HTMLElement | null);
    if (el && top.route.name !== "player") autofocus(el, top.focusKey);
  }, [topKey, !!lineup]);

  const toggleFav = useCallback((id: string) => {
    setFavs((f) => {
      const next = f.indexOf(id) >= 0 ? f.filter((x) => x !== id) : f.concat(id);
      store.setFavs(next);
      return next;
    });
  }, []);

  const changeMarket = useCallback(
    (code: string) => {
      store.setMarket(code);
      setStack([{ route: { name: "home" }, focusKey: null }]);
      if (!lineup || code !== lineup.market.code) load(code);
    },
    [lineup, load],
  );

  // ── Number keys: type a channel number, tune after a short pause ────────────
  const flash = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showNotice = (text: string) => {
    clearTimeout(flash.current);
    setNotice(text);
    flash.current = setTimeout(() => setNotice(null), 2500);
  };
  const commitRef = useRef<(n: number) => void>(() => {});
  commitRef.current = (n: number) => {
    const ch = lineup && lineup.channels.filter((c) => c.num === n)[0];
    if (ch) openChannel(ch.slug);
    else showNotice(`No channel ${n}`);
  };
  const entry = useMemo(() => createNumberEntry(setDigits, (n) => commitRef.current(n)), []);

  // ── Exit dialog (BACK on Home) ──────────────────────────────────────────────
  const openExit = () => {
    focusBeforeDialog.current = document.activeElement as HTMLElement | null;
    setExitOpen(true);
  };
  const closeExit = () => {
    setExitOpen(false);
    const prev = focusBeforeDialog.current;
    setTimeout(() => (prev && document.body.contains(prev) ? prev.focus() : undefined), 0);
  };
  useEffect(() => {
    if (exitOpen && exitRef.current) autofocus(exitRef.current);
  }, [exitOpen]);
  useKeys((k) => {
    if (k && (k.action === "back" || k.action === "backspace")) {
      closeExit();
      return true;
    }
    return false;
  }, exitOpen);

  const goBack = () => {
    if (digits) entry.cancel();
    else if (stack.length > 1) pop();
    else openExit();
  };

  // ── The one keydown listener ────────────────────────────────────────────────
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keyAction(e);
      if (dispatchKey(k, e)) {
        e.preventDefault();
        return;
      }
      if (!k) return;
      const dir = ARROWS[k.action];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (k.action === "back" || k.action === "backspace") {
        e.preventDefault();
        goBackRef.current();
      } else if (k.action === "digit" && !document.querySelector("[data-modal]")) {
        e.preventDefault();
        entry.push(k.digit!);
      } else if (k.action === "ok") {
        const el = document.activeElement;
        if (!el || el === document.body) {
          e.preventDefault();
          move("d");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!lineup) {
    return (
      <div className="splash">
        <Logo />
        {loadError ? (
          <div className="splashError">
            <p>We couldn’t reach rebaTV. Check that the TV is connected to the internet.</p>
            <button type="button" className="cta" data-nav="" data-autofocus="" ref={(b) => { if (b) b.focus(); }} onClick={() => load()}>
              Try again
            </button>
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }

  return (
    <div className={`app platform-${platform}`}>
      <div ref={screensRef}>
        {stack.map((entryItem, i) => {
          const r = entryItem.route;
          const active = i === stack.length - 1 && !exitOpen;
          return (
            <div key={i + r.name} className="layer" style={{ display: i === stack.length - 1 ? "block" : "none" }}>
              {r.name === "home" && (
                <Home
                  lineup={lineup}
                  byId={byId}
                  favs={favs}
                  onOpen={openChannel}
                  onSearch={() => push({ name: "search" })}
                  onSettings={() => push({ name: "settings" })}
                />
              )}
              {r.name === "search" && <Search lineup={lineup} active={active} onOpen={openChannel} />}
              {r.name === "settings" && <Settings lineup={lineup} onPick={changeMarket} />}
              {r.name === "player" && (
                <Player channels={lineup.channels} slug={r.slug} favs={favs} onZap={openChannel} onToggleFav={toggleFav} onBack={pop} />
              )}
            </div>
          );
        })}
      </div>

      {digits && (
        <div className="numberEntry">
          CH {digits}
          <span className="caret" />
        </div>
      )}
      {notice && !digits && <div className="numberEntry notice">{notice}</div>}

      {exitOpen && (
        <div className="modalBackdrop">
          <div className="dialog" data-modal="" ref={exitRef}>
            <h2 className="dialogTitle">Exit rebaTV?</h2>
            <div className="dialogActions">
              <button type="button" className="cta" data-nav="" onClick={exitApp}>
                Exit
              </button>
              <button type="button" className="cta ctaGhost" data-nav="" data-autofocus="" onClick={closeExit}>
                Keep watching
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
