"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import Link from "next/link";
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
  "id" | "slug" | "short" | "name" | "num" | "tag" | "hue" | "streamUrl" | "logoUrl"
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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  useEffect(() => {
    const video = videoRef.current;
    const src = cur.streamUrl;
    if (!video) return;
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the selected channel
      setStatus("offline");
      return;
    }
    let hls: HlsType | null = null;
    let cancelled = false;
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

    const onPlaying = () => !cancelled && setStatus((st) => (st === "blocked" ? st : "playing"));
    const onError = () => !cancelled && setStatus("error");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    // Safari, Tizen, webOS and other TV engines play HLS natively; elsewhere load hls.js on demand.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      play();
    } else {
      // The light build (no subtitles/EME/alt-audio) is ~30% smaller; the types match the full build.
      import("hls.js/light").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) return setStatus("error");
        const instance = new Hls({ lowLatencyMode: false, backBufferLength: 30 });
        let recoveredMedia = false;
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
            recoveredMedia = true;
            instance.recoverMediaError();
          } else {
            setStatus("error");
          }
        });
        instance.on(Hls.Events.MANIFEST_PARSED, () => play());
        instance.loadSource(src);
        instance.attachMedia(video);
        hls = instance;
      }, () => setStatus("error"));
    }

    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [cur.streamUrl]);

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
        const target = overlayRef.current?.querySelector<HTMLElement>("[data-autofocus]");
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

  const unmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setStatus("playing");
  };

  const statusText: Partial<Record<Status, string>> = {
    loading: "Tuning in…",
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
        style={{ visibility: status === "playing" || status === "blocked" ? "visible" : "hidden" }}
      />

      <div ref={overlayRef} className={`${s.overlay} ${overlay ? "" : s.hidden}`}>
        <div className={s.top}>
          <Link href={marketPath(market)} className={s.back} data-nav="" data-home="">
            <span aria-hidden="true">←</span> Back
          </Link>
          {status === "blocked" && (
            <button type="button" className={s.btn} onClick={unmute} data-nav="">
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
            {cur.logoUrl ? <ChannelLogo key={cur.logoUrl} src={cur.logoUrl} sizes="12em" eager className={s.markTile} /> : cur.short}
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
            <button type="button" className={s.btn} onClick={() => zap(-1)} aria-label={`Channel down: ${down.name}`} data-nav="">
              CH −
            </button>
            <button type="button" className={s.btn} onClick={toggleFav} aria-pressed={isFav} data-nav="">
              {isFav ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
