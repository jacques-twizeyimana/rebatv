import Hls from "hls.js/light";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { hlsUrl } from "../api";
import { ChannelLogo, Clock, hueVars, LiveBadge } from "../components/ui";
import { useKeys } from "../keybus";
import { autofocus } from "../nav";
import { BWE, read, write } from "../store";
import type { Channel } from "../types";

/**
 * Full-screen live player, ported from rebatv-web/src/components/tv/Player.tsx.
 *
 * Stream strategy (same as the web):
 * 1. hls.js (MediaSource) reading playlists through rebatv-web's /hls proxy, which serves them
 *    uncompressed and with CORS; video segments still come straight from the broadcaster.
 * 2. The TV's native HLS player with the broadcaster's own URL, when hls.js can't run or fails
 *    (e.g. segments without CORS).
 */

type Props = {
  channels: Channel[];
  slug: string;
  favs: string[];
  onZap: (slug: string) => void;
  onToggleFav: (id: string) => void;
  onBack: () => void;
};
type Status = "idle" | "loading" | "playing" | "paused" | "blocked" | "offline" | "error";

const OVERLAY_MS = 6000;

// Seed hls.js with the bandwidth measured last time, so tune-in doesn't start on the lowest level.
let lastBandwidth = 0;
function initialBandwidth(): number {
  if (!lastBandwidth) lastBandwidth = Number(read(BWE)) || 0;
  return lastBandwidth || 3e6;
}
function saveBandwidth(bps: number) {
  if (!isFinite(bps) || bps <= 0) return;
  lastBandwidth = Math.round(bps);
  write(BWE, String(lastBandwidth));
}

// Channels whose segments hls.js can't fetch: go straight to native playback next time.
const nativeOnly: Record<string, boolean> = {};

const TUNING_WORDS = [
  "Catching the signal…",
  "Riding the airwaves…",
  "Finding the frequency…",
  "Catching the wave…",
  "Adjusting the antenna…",
  "Locking on to the broadcast…",
  "Tuning in…",
  "Going on air…",
];

function TuningIn() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TUNING_WORDS.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="tuning">
      <div className="spinner" />
      <span key={i} className="tuningWord">
        {TUNING_WORDS[i]}
      </span>
    </div>
  );
}

function canPlayHlsNatively(video: HTMLVideoElement) {
  return !!(video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL"));
}

export function zapTarget(list: Channel[], slug: string, dir: 1 | -1): Channel | undefined {
  if (list.length === 0) return undefined;
  let i = 0;
  for (let j = 0; j < list.length; j++) if (list[j].slug === slug) i = j;
  return list[(i + dir + list.length) % list.length];
}

export function Player({ channels, slug, favs, onZap, onToggleFav, onBack }: Props) {
  const [overlay, setOverlay] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  // Paused while the app is in the background (LG guideline); restarts the stream on return.
  const [suspended, setSuspended] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const overlayVisible = useRef(true);

  const cur = channels.filter((c) => c.slug === slug)[0] || channels[0];
  const up = zapTarget(channels, cur.slug, 1)!;
  const down = zapTarget(channels, cur.slug, -1)!;
  const isFav = favs.indexOf(cur.id) >= 0;

  const poke = useCallback(() => {
    clearTimeout(hideTimer.current);
    overlayVisible.current = true;
    setOverlay(true);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.paused) return;
      overlayVisible.current = false;
      setOverlay(false);
    }, OVERLAY_MS);
  }, []);

  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  // Focus CH + when the player opens.
  useEffect(() => {
    if (overlayRef.current) autofocus(overlayRef.current);
  }, []);

  useEffect(() => {
    const onVisibility = () => setSuspended(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const zap = (dir: 1 | -1) => {
    const next = zapTarget(channels, cur.slug, dir);
    if (next) onZap(next.slug);
    poke();
  };

  // ── Stream ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const direct = cur.streamUrl;
    if (!video || suspended) return;
    if (!direct) {
      setStatus("offline");
      return;
    }
    let hls: Hls | null = null;
    let cancelled = false;
    let native = false;
    const nativeSupported = canPlayHlsNatively(video);
    setStatus("loading");

    const play = () => {
      const p = video.play();
      if (!p || typeof p.then !== "function") return;
      p.then(undefined, (err: DOMException) => {
        if (!err || err.name !== "NotAllowedError") return;
        // Autoplay with sound blocked (hosted browsers): start muted and offer unmute.
        video.muted = true;
        video.play().then(() => !cancelled && setStatus("blocked"), () => {});
      });
    };

    const playNative = () => {
      if (cancelled) return;
      if (!nativeSupported) {
        setStatus("error");
        return;
      }
      native = true;
      video.src = direct;
      play();
    };

    const onPlaying = () => !cancelled && setStatus((st) => (st === "blocked" ? st : "playing"));
    const onPause = () => !cancelled && setStatus((st) => (st === "playing" ? "paused" : st));
    const onError = () => !cancelled && native && setStatus("error");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    const cleanup = () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      if (hls) hls.destroy();
      video.removeAttribute("src");
      video.load();
    };

    if (nativeOnly[cur.slug] && nativeSupported) {
      playNative();
      return cleanup;
    }

    if (!Hls.isSupported()) {
      playNative();
      return cleanup;
    }
    const instance = new Hls({
      lowLatencyMode: false,
      backBufferLength: 30,
      abrEwmaDefaultEstimate: initialBandwidth(),
      testBandwidth: false,
      capLevelToPlayerSize: true,
    });
    let recoveredMedia = false;
    instance.on(Hls.Events.ERROR, (_e, data) => {
      if (cancelled) return;
      // A segment blocked outright (status 0: no CORS) won't succeed on retry.
      const blockedSegment = data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR && data.response && data.response.code === 0;
      if (blockedSegment && nativeSupported) {
        nativeOnly[cur.slug] = true;
        instance.destroy();
        hls = null;
        return playNative();
      }
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
        recoveredMedia = true;
        instance.recoverMediaError();
        return;
      }
      instance.destroy();
      hls = null;
      playNative();
    });
    instance.on(Hls.Events.MANIFEST_PARSED, () => play());
    instance.on(Hls.Events.FRAG_BUFFERED, () => saveBandwidth(instance.bandwidthEstimate));
    instance.loadSource(hlsUrl(cur.slug));
    instance.attachMedia(video);
    hls = instance;

    return cleanup;
  }, [cur.slug, cur.streamUrl, suspended]);

  const unmute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setStatus("playing");
  }, []);

  const togglePlay = (want?: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    const shouldPlay = want === undefined ? v.paused : want;
    if (shouldPlay) {
      // Live: jump back to the live edge rather than resuming minutes behind.
      const seekable = v.seekable;
      if (seekable && seekable.length) {
        try {
          v.currentTime = Math.max(seekable.start(0), seekable.end(seekable.length - 1) - 3);
        } catch {}
      }
      const p = v.play();
      if (p && p.then) p.then(undefined, () => {});
    } else {
      v.pause();
    }
  };

  // ── Remote keys (run before the app's defaults) ─────────────────────────────
  useKeys((k, e) => {
    const wasHidden = !overlayVisible.current;
    poke();
    if (status === "blocked" && k) unmute();
    if (!k) return false;
    switch (k.action) {
      case "up":
      case "chUp":
        zap(1);
        return true;
      case "down":
      case "chDown":
        zap(-1);
        return true;
      case "play":
        togglePlay(true);
        return true;
      case "pause":
        togglePlay(false);
        return true;
      case "playPause":
        togglePlay();
        return true;
      case "stop":
        onBack();
        return true;
    }
    if (wasHidden && (k.action === "ok" || k.action === "left" || k.action === "right")) {
      // First press only reveals the controls instead of triggering a hidden button.
      if (overlayRef.current && !overlayRef.current.contains(document.activeElement)) autofocus(overlayRef.current);
      e.preventDefault();
      return true;
    }
    return false;
  });

  const statusText: Partial<Record<Status, string>> = {
    offline: `${cur.name} isn’t streaming on rebaTV right now. Try another channel with CH + or CH −.`,
    error: `We couldn’t load ${cur.name}. The broadcaster’s stream may be down. Try again later or switch channel.`,
  };

  const visible = status === "playing" || status === "blocked" || status === "paused";

  return (
    <section className="player" style={hueVars(cur.hue)} onMouseMove={poke}>
      <div className="fill gradient" />
      <div className="scanlines" />
      <div className="fill placeholder">
        <div className="placeholderMark">{cur.short}</div>
        <div className="placeholderNote">{cur.name}</div>
        {status === "loading" && <TuningIn key={cur.slug} />}
        {statusText[status] && <p className="status">{statusText[status]}</p>}
      </div>

      <video ref={videoRef} className="fill video" autoPlay style={{ visibility: visible ? "visible" : "hidden" }} />

      <div ref={overlayRef} className={`fill overlay${overlay ? "" : " hidden"}`}>
        <div className="playerTop">
          <button type="button" className="btn back" data-nav="" onClick={onBack}>
            ← Back
          </button>
          {status === "blocked" && (
            <button type="button" className="btn" data-nav="" onClick={unmute}>
              🔇 Unmute
            </button>
          )}
          {status === "paused" && <span className="pausedNote">Paused · press ▶ to go live</span>}
          <Clock className="playerClock" />
        </div>

        <ul className="strip">
          <li className="stripItem">
            <span className="stripNum">{up.num}</span>
            <span className="stripName">{up.name}</span>
          </li>
          <li className="stripItem stripCurrent">
            <span className="stripNum">{cur.num}</span>
            <span className="stripName">{cur.name}</span>
          </li>
          <li className="stripItem">
            <span className="stripNum">{down.num}</span>
            <span className="stripName">{down.name}</span>
          </li>
          <li className="stripHint">▲ ▼ · CH +/− · 0–9 to switch</li>
        </ul>

        <div className="playerBottom">
          <div className="mark">{cur.logo ? <ChannelLogo key={cur.logo} src={cur.logo} className="logoTile markTile" /> : cur.short}</div>
          <div className="info">
            <div className="infoMeta">
              <LiveBadge />
              <span>CH {cur.num}</span>
            </div>
            <h1 className="title">{cur.name}</h1>
            <p className="tag">{cur.tag}</p>
          </div>
          <div className="controls">
            <button type="button" className="btn" data-nav="" data-autofocus="" onClick={() => zap(1)}>
              CH +
            </button>
            <button type="button" className="btn" data-nav="" onClick={() => zap(-1)}>
              CH −
            </button>
            <button type="button" className="btn" data-nav="" onClick={() => onToggleFav(cur.id)}>
              {isFav ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
