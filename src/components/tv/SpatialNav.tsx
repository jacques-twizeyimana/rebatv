"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * D-pad / arrow-key navigation for TVs, ported from the design's move()/autofocus().
 *
 * Markup contract (on real <a>/<button> elements, so Tab, Enter and screen readers still work):
 *   data-nav          — reachable with arrow keys
 *   data-autofocus    — preferred initial focus on a screen
 *   data-row          — a horizontal row; focusing inside it scrolls the row under the header
 *   data-top          — focusing inside scrolls the page to the top
 *   data-home         — link used by the BACK key to return Home
 *   data-focus-key    — restored on Home after coming back from a channel
 *   data-screen       — on <main>: "home" | "search" | "player"
 * Components that own keys (player, search) listen in the capture phase and preventDefault().
 */

type Dir = "u" | "d" | "l" | "r";

const ARROWS: Record<string, Dir> = { ArrowUp: "u", ArrowDown: "d", ArrowLeft: "l", ArrowRight: "r" };
// Tizen (10009) and webOS (461) report BACK by keyCode only.
const BACK_KEYS = new Set(["Escape", "GoBack", "BrowserBack", "Back"]);
const BACK_CODES = new Set([10009, 461]);
const LAST_FOCUS = "rtv:lastFocus";

export function isBackKey(e: KeyboardEvent) {
  return BACK_KEYS.has(e.key) || BACK_CODES.has(e.keyCode);
}

function isEditable(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scope(): ParentNode {
  return document.querySelector("dialog[open]") ?? document;
}

function navigable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-nav]")).filter((el) => {
    if ((el as HTMLButtonElement).disabled) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

export function focusEl(el: HTMLElement) {
  const behavior: ScrollBehavior = reducedMotion() ? "auto" : "smooth";
  const row = el.closest<HTMLElement>("[data-row]");
  if (!row) {
    el.focus({ preventScroll: true });
    if (el.closest("[data-top]")) window.scrollTo({ top: 0, behavior });
    else el.scrollIntoView({ block: "nearest", behavior });
    return;
  }
  el.focus({ preventScroll: true });
  const fs = parseFloat(getComputedStyle(row).fontSize) || 16;
  window.scrollTo({ top: Math.max(0, row.getBoundingClientRect().top + window.scrollY - fs * 5), behavior });
}

function move(d: Dir) {
  const root = scope();
  const els = navigable(root);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !els.includes(cur)) {
    const first = root.querySelector<HTMLElement>("[data-autofocus]") ?? els[0];
    if (first) focusEl(first);
    return;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of els) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax;
    const dy = b.top + b.height / 2 - ay;
    let primary: number;
    let secondary: number;
    if (d === "r") {
      if (dx < a.width * 0.25) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (d === "l") {
      if (-dx < a.width * 0.25) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (d === "d") {
      if (dy < a.height * 0.25) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else {
      if (-dy < a.height * 0.25) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }
    const score = primary + secondary * (d === "l" || d === "r" ? 4 : 1.2);
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) focusEl(best);
}

function screen(): string | undefined {
  return document.querySelector<HTMLElement>("main[data-screen]")?.dataset.screen;
}

function autofocus() {
  if (document.querySelector("dialog[open]")) return;

  if (screen() === "home") {
    let key: string | null = null;
    try {
      key = sessionStorage.getItem(LAST_FOCUS);
      sessionStorage.removeItem(LAST_FOCUS);
    } catch {}
    const restored = key ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`) : null;
    if (restored) return focusEl(restored);
  }
  const el =
    document.querySelector<HTMLElement>("main [data-autofocus]") ??
    document.querySelector<HTMLElement>("main [data-nav]") ??
    document.querySelector<HTMLElement>("[data-nav]");
  if (el) focusEl(el);
}

export function SpatialNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const id = requestAnimationFrame(autofocus);
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    const goHome = () => {
      const home = document.querySelector<HTMLAnchorElement>("a[data-home]");
      if (home) router.push(home.getAttribute("href") || "/");
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const active = document.activeElement;
      const editing = isEditable(active);

      if (isBackKey(e) || (e.key === "Backspace" && !editing)) {
        const dlg = document.querySelector<HTMLDialogElement>("dialog[open]");
        if (dlg) {
          // Native <dialog> already handles Escape; close it for remote BACK keys too.
          if (e.key !== "Escape") {
            e.preventDefault();
            dlg.close();
          }
          return;
        }
        if (screen() !== "home") {
          e.preventDefault();
          goHome();
        }
        return;
      }

      const d = ARROWS[e.key];
      if (!d) return;
      if (editing && (d === "l" || d === "r")) {
        // Let the caret move inside the text; leave the field only from its edges.
        const input = active as HTMLInputElement;
        const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
        const atEnd = input.selectionStart === input.value.length;
        if ((d === "l" && !atStart) || (d === "r" && !atEnd)) return;
      }
      e.preventDefault();
      move(d);
    };

    // Remember which card opened a channel, so BACK lands on it again.
    const onClick = (e: MouseEvent) => {
      if (screen() !== "home") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-focus-key]");
      if (!el) return;
      try {
        sessionStorage.setItem(LAST_FOCUS, el.dataset.focusKey!);
      } catch {}
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
    };
  }, [router]);

  return null;
}
