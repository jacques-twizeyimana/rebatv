"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import Link from "next/link";
import { hlsProxyPath } from "@/lib/hls";
import { zapTarget } from "@/lib/lineup";
import { hueVars, marketPath, SITE_NAME, watchPath } from "@/lib/site";
import type { LineupChannel } from "@/lib/types";
import { ChannelLogo } from "./ChannelLogo";
import { Clock } from "./Clock";
import { LiveBadge } from "./LiveBadge";
import { focusEl } from "./SpatialNav";
import tv from "./tv.module.css";
import s from "./player.module.css";

type PlayerChannel = Pick<
  LineupChannel,
  | "id"
  | "slug"
  | "short"
  | "name"
  | "num"
  | "tag"
  | "hue"
  | "streamUrl"
  | "logoUrl"
>;
type Props = { channels: PlayerChannel[]; initialSlug: string; market: string };
type Status = "idle" | "loading" | "playing" | "blocked" | "offline" | "error";

const OVERLAY_MS = 6000;
const FAVS_KEY = "rtv:favs";
const UP_KEYS = new Set(["ArrowUp", "PageUp", "ChannelUp"]);
const DOWN_KEYS = new Set(["ArrowDown", "PageDown", "ChannelDown"]);
// Tizen reports CH+/CH− as keyCodes 427/428.
const UP_CODES = new Set([427]);
const DOWN_CODES = new Set([428]);

// Fetch hls.js as soon as this module loads, in parallel with hydration, rather than after the
// player effect runs.
const hlsModule = typeof window === "undefined" ? null : import("hls.js/light");
hlsModule?.catch(() => {});

// hls.js starts on the first variant in the master playlist (usually the lowest) and only climbs
// once it has measured a few segments, so every tune-in began blurry. Seed it with the bandwidth
// measured on the previous channel/visit instead, else the browser's own hint.
const BWE_KEY = "rtv:bwe";
let lastBandwidth = 0;

function initialBandwidth(): number {
  if (!lastBandwidth) {
    try {
      lastBandwidth = Number(localStorage.getItem(BWE_KEY)) || 0;
    } catch {}
  }
  if (lastBandwidth) return lastBandwidth;
  // Chromium's `downlink` badly underestimates fast links, so only trust its coarse "slow" signal.
  // If 3 Mbps is too optimistic, hls.js drops a level mid-fragment.
  const type = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection?.effectiveType;
  return type && type !== "4g" ? 1e6 : 3e6;
}

function saveBandwidth(bps: number) {
  if (!Number.isFinite(bps) || bps <= 0) return;
  lastBandwidth = Math.round(bps);
  try {
    localStorage.setItem(BWE_KEY, String(lastBandwidth));
  } catch {}
}

// Channels whose segments hls.js can't fetch (no CORS, e.g. TV1): go straight to native playback
// on later visits instead of loading two playlists through hls.js just to fail again.
const nativeOnly = new Set<string>();

// Rotating "Tuning in…" lines while a stream starts. The first one stays first.
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
const TUNING_MS = 1800;

function TuningIn({ channel }: { channel: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setI((n) => (n + 1) % TUNING_WORDS.length),
      TUNING_MS,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div className={s.tuning} role="status">
      <div className={s.spinner} aria-hidden="true" />
      {/* Announce once; the rotating line would otherwise be read out every couple of seconds. */}
      <span className="sr-only">Tuning in to {channel}</span>
      <span key={i} className={s.tuningWord} aria-hidden="true">
        {TUNING_WORDS[i]}
      </span>
    </div>
  );
}

function readFavs(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function Player({ channels, initialSlug, market }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [overlay, setOverlay] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [favs, setFavs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const overlayVisible = useRef(true);

  const cur = channels.find((c) => c.slug === slug) ?? channels[0];
  const up = zapTarget(channels, cur.slug, 1)!;
  const down = zapTarget(channels, cur.slug, -1)!;
  const isFav = favs.includes(cur.id);

  // ── Overlay auto-hide (design: 6 s after the last interaction) ──────────────
  const poke = useCallback(() => {
    clearTimeout(hideTimer.current);
    overlayVisible.current = true;
    setOverlay(true);
    hideTimer.current = setTimeout(() => {
      // Keep controls visible for users who prefer reduced motion, or while the stream isn't playing.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (videoRef.current?.paused) return;
      overlayVisible.current = false;
      setOverlay(false);
    }, OVERLAY_MS);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setFavs(readFavs());
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  // ── Zapping: swap the stream in place and keep the URL/title in sync ─────────
  const zap = useCallback(
    (dir: 1 | -1) => {
      const next = zapTarget(channels, slug, dir);
      if (!next) return;
      setSlug(next.slug);
      window.history.replaceState(null, "", watchPath(market, next.slug));
      document.title = `${next.name} live · ${SITE_NAME}`;
      poke();
    },
    [channels, slug, market, poke],
  );

  // ── Stream ──────────────────────────────────────────────────────────────────
  // 1. hls.js (MediaSource) reading playlists through our same-origin proxy (src/app/hls), which
  //    serves them uncompressed and with CORS; video segments still come from the broadcaster.
  // 2. Native HLS (Safari, TVs, recent Chrome) with the broadcaster's own URL, when hls.js can't
  //    run or fails (e.g. segments without CORS). Native players reject a proxied playlist whose
  //    segments live on another origin, so they always get the direct URL.
  useEffect(() => {
    const video = videoRef.current;
    const direct = cur.streamUrl;
    if (!video) return;
    if (!direct) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the selected channel
      setStatus("offline");
      return;
    }
    let hls: HlsType | null = null;
    let cancelled = false;
    let native = false;
    const nativeSupported = !!video.canPlayType(
      "application/vnd.apple.mpegurl",
    );
    setStatus("loading");

    const play = async () => {
      try {
        await video.play();
      } catch (err) {
        if ((err as DOMException)?.name !== "NotAllowedError") return;
        // Autoplay with sound was blocked (direct page load): start muted and offer unmute.
        video.muted = true;
        try {
          await video.play();
          if (!cancelled) setStatus("blocked");
        } catch {}
      }
    };

    const playNative = () => {
      if (cancelled) return;
      if (!nativeSupported) return setStatus("error");
      native = true;
      video.src = direct;
      play();
    };

    const onPlaying = () =>
      !cancelled && setStatus((st) => (st === "blocked" ? st : "playing"));
    // With hls.js, errors arrive through its ERROR event instead.
    const onError = () => !cancelled && native && setStatus("error");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    const cleanup = () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };

    if (nativeOnly.has(cur.slug) && nativeSupported) {
      playNative();
      return cleanup;
    }

    // The light build (no subtitles/EME/alt-audio) is ~30% smaller; the types match the full build.
    hlsModule!.then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) return playNative();
      const instance = new Hls({
        lowLatencyMode: false,
        backBufferLength: 30,
        abrEwmaDefaultEstimate: initialBandwidth(),
        // Pick the start level from that estimate rather than test-loading the lowest level first.
        testBandwidth: false,
        // Don't spend bandwidth (and start-up time) on renditions larger than the screen.
        capLevelToPlayerSize: true,
      });
      let recoveredMedia = false;
      instance.on(Hls.Events.ERROR, (_e, data) => {
        if (cancelled) return;
        // A segment blocked outright (status 0: no CORS header, as with TV1) won't succeed on
        // retry; switch to native playback at once instead of waiting out hls.js's retries.
        const blockedSegment =
          data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR &&
          data.response?.code === 0;
        if (blockedSegment && nativeSupported) {
          nativeOnly.add(cur.slug);
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
      instance.on(Hls.Events.FRAG_BUFFERED, () =>
        saveBandwidth(instance.bandwidthEstimate),
      );
      instance.loadSource(hlsProxyPath(cur.slug));
      instance.attachMedia(video);
      hls = instance;
    }, playNative);

    return cleanup;
  }, [cur.slug, cur.streamUrl]);

  // ── Remote keys (capture phase: runs before SpatialNav) ───────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const wasHidden = !overlayVisible.current;
      poke();
      if (UP_KEYS.has(e.key) || UP_CODES.has(e.keyCode)) {
        e.preventDefault();
        zap(1);
      } else if (DOWN_KEYS.has(e.key) || DOWN_CODES.has(e.keyCode)) {
        e.preventDefault();
        zap(-1);
      } else if (wasHidden && (e.key === "Enter" || e.key === " ")) {
        // First OK press only reveals the controls instead of triggering a hidden button.
        e.preventDefault();
      }
      if (wasHidden && !overlayRef.current?.contains(document.activeElement)) {
        const target =
          overlayRef.current?.querySelector<HTMLElement>("[data-autofocus]");
        if (target) focusEl(target);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [poke, zap]);

  const toggleFav = () => {
    const next = isFav ? favs.filter((f) => f !== cur.id) : favs.concat(cur.id);
    setFavs(next);
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify(next));
    } catch {}
  };

  const unmute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setStatus("playing");
  }, []);

  // Browsers only allow sound after the viewer has interacted with the page, so a direct load
  // (shared link, bookmark, refresh) starts muted. Turn the sound on with the first key press,
  // click or tap anywhere, not only on the Unmute button. Zapping is such a press too, so the
  // next channel doesn't stay silently muted.
  useEffect(() => {
    if (status !== "blocked") return;
    const onGesture = () => {
      // Unmuting outside a user gesture makes the browser pause the video (e.g. Escape, which
      // doesn't count as one); wait for the next press instead.
      const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
      if (activation && !activation.isActive) return;
      unmute();
    };
    window.addEventListener("keydown", onGesture, true);
    window.addEventListener("pointerup", onGesture, true);
    return () => {
      window.removeEventListener("keydown", onGesture, true);
      window.removeEventListener("pointerup", onGesture, true);
    };
  }, [status, unmute]);

  const statusText: Partial<Record<Status, string>> = {
    offline: `${cur.name} isn’t streaming on rebaTV right now. Try another channel with CH + or CH −.`,
    error: `We couldn’t load ${cur.name}. The broadcaster’s stream may be down. Try again later or switch channel.`,
  };

  return (
    <section
      className={s.player}
      style={hueVars(cur.hue)}
      aria-label={`Now playing: ${cur.name}`}
      onPointerMove={poke}
      onPointerDown={poke}
    >
      <div className={`${s.fill} ${tv.gradient}`} aria-hidden="true" />
      <div className={s.scanlines} aria-hidden="true" />
      <div className={s.placeholder}>
        <div className={s.placeholderMark} aria-hidden="true">
          {cur.short}
        </div>
        <div className={s.placeholderNote}>HLS live stream · {cur.name}</div>
        {status === "loading" && <TuningIn key={cur.slug} channel={cur.name} />}
        {statusText[status] && (
          <p className={s.status} role="status">
            {statusText[status]}
          </p>
        )}
      </div>

      <video
        ref={videoRef}
        className={s.video}
        playsInline
        autoPlay
        aria-label={`${cur.name} live stream`}
        style={{
          visibility:
            status === "playing" || status === "blocked" ? "visible" : "hidden",
        }}
      />

      <div
        ref={overlayRef}
        className={`${s.overlay} ${overlay ? "" : s.hidden}`}
      >
        <div className={s.top}>
          <Link
            href={marketPath(market)}
            className={s.back}
            data-nav=""
            data-home=""
          >
            <span aria-hidden="true">←</span> Back
          </Link>
          {status === "blocked" && (
            <button
              type="button"
              className={s.btn}
              onClick={unmute}
              data-nav=""
            >
              🔇 Unmute
            </button>
          )}
          <Clock className={s.clock} />
        </div>

        <ul className={s.strip} aria-label="Channel guide">
          <li className={s.stripItem}>
            <span className={s.stripNum}>{up.num}</span>
            <span className={s.stripName}>{up.name}</span>
          </li>
          <li className={s.stripCurrent} aria-current="true">
            <span className={s.stripNum}>{cur.num}</span>
            <span className={s.stripName}>{cur.name}</span>
          </li>
          <li className={s.stripItem}>
            <span className={s.stripNum}>{down.num}</span>
            <span className={s.stripName}>{down.name}</span>
          </li>
          <li className={s.stripHint} aria-hidden="true">
            ▲ ▼ or CH +/− to switch
          </li>
        </ul>

        <div className={s.bottom}>
          <div className={s.mark} aria-hidden="true">
            {cur.logoUrl ? (
              <ChannelLogo
                key={cur.logoUrl}
                src={cur.logoUrl}
                sizes="12em"
                eager
                className={s.markTile}
              />
            ) : (
              cur.short
            )}
          </div>
          <div className={s.info}>
            <div className={s.infoMeta}>
              <LiveBadge />
              <span>CH {cur.num}</span>
            </div>
            <h1 className={s.title} aria-live="polite">
              {cur.name}
            </h1>
            <p className={s.tag}>{cur.tag}</p>
          </div>
          <div className={s.controls}>
            <button
              type="button"
              className={s.btn}
              onClick={() => zap(1)}
              aria-label={`Channel up: ${up.name}`}
              data-nav=""
              data-autofocus=""
            >
              CH +
            </button>
            <button
              type="button"
              className={s.btn}
              onClick={() => zap(-1)}
              aria-label={`Channel down: ${down.name}`}
              data-nav=""
            >
              CH −
            </button>
            <button
              type="button"
              className={s.btn}
              onClick={toggleFav}
              aria-pressed={isFav}
              data-nav=""
            >
              {isFav ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
