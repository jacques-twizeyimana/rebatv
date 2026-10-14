/**
 * D-pad spatial navigation, ported from rebatv-web's SpatialNav (the design's move() scoring).
 *
 * Markup contract (real <button>s, so OK/Enter clicks them natively):
 *   data-nav         reachable with the arrow keys
 *   data-autofocus   preferred focus when a screen opens
 *   data-focus-key   stable id used to restore focus (e.g. coming back from the player)
 *   data-modal       while one is in the DOM, navigation stays inside it
 *   data-track       horizontally sliding row; its parent clips it
 *   data-vtrack      vertically sliding page/list; its parent clips it.
 *                    "align": the focused [data-vitem] snaps to the top; otherwise the focused
 *                    element is just kept in view. Focus inside [data-top] slides back to 0.
 *
 * Sliding uses transforms instead of scrolling: smoother on TV GPUs, and old engines lack
 * scrollIntoView options and smooth scrolling.
 */

export type Dir = "u" | "d" | "l" | "r";

export type Rect = { left: number; top: number; width: number; height: number };

const EDGE_PAD_EM = 4;

export function scope(): ParentNode {
  const modals = document.querySelectorAll("[data-modal]");
  return modals.length ? modals[modals.length - 1] : document;
}

export function navigable(root: ParentNode = scope()): HTMLElement[] {
  const out: HTMLElement[] = [];
  const list = root.querySelectorAll<HTMLElement>("[data-nav]");
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    if ((el as HTMLButtonElement).disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push(el);
  }
  return out;
}

/**
 * Index of the best candidate to move to from `from` in direction `d`, or -1. Pure (rects in,
 * index out) so it can be unit tested. Same weights as the web app.
 */
export function pickNext(from: Rect, candidates: Rect[], d: Dir): number {
  const ax = from.left + from.width / 2;
  const ay = from.top + from.height / 2;
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    const dx = b.left + b.width / 2 - ax;
    const dy = b.top + b.height / 2 - ay;
    let primary: number;
    let secondary: number;
    if (d === "r") {
      if (dx < from.width * 0.25) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (d === "l") {
      if (-dx < from.width * 0.25) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (d === "d") {
      if (dy < from.height * 0.25) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else {
      if (-dy < from.height * 0.25) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }
    const score = primary + secondary * (d === "l" || d === "r" ? 4 : 1.2);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function emPx(el: Element): number {
  return parseFloat(getComputedStyle(el).fontSize) || 16;
}

function closest(el: Element | null, selector: string): HTMLElement | null {
  // Element.closest is Chrome 41+, fine for webOS 4; kept as a helper for readability.
  return el ? (el.closest(selector) as HTMLElement | null) : null;
}

function slide(track: HTMLElement, axis: "x" | "y", target: number) {
  const viewport = track.parentElement;
  if (!viewport) return;
  const max = axis === "x" ? track.scrollWidth - viewport.clientWidth : track.scrollHeight - viewport.clientHeight;
  const v = Math.round(Math.max(0, Math.min(target, Math.max(0, max))));
  track.setAttribute("data-offset", String(v));
  track.style.transform = axis === "x" ? `translate3d(${-v}px,0,0)` : `translate3d(0,${-v}px,0)`;
}

function offsetOf(track: HTMLElement): number {
  return Number(track.getAttribute("data-offset")) || 0;
}

/** Slides every track around `el` so that it is on screen. */
export function reveal(el: HTMLElement) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node.hasAttribute("data-track")) {
      const viewport = node.parentElement!;
      const r = el.getBoundingClientRect();
      const t = node.getBoundingClientRect();
      const left = r.left - t.left; // layout position inside the track (both share its transform)
      const right = left + r.width;
      const pad = emPx(node) * EDGE_PAD_EM;
      let x = offsetOf(node);
      if (right - x > viewport.clientWidth - pad) x = right - viewport.clientWidth + pad;
      if (left - x < pad) x = left - pad;
      slide(node, "x", x);
    }
    if (node.hasAttribute("data-vtrack")) {
      const viewport = node.parentElement!;
      const t = node.getBoundingClientRect();
      if (closest(el, "[data-top]")) {
        slide(node, "y", 0);
        continue;
      }
      const pad = emPx(node) * 2;
      if (node.getAttribute("data-vtrack") === "align") {
        const item = closest(el, "[data-vitem]") || el;
        slide(node, "y", item.getBoundingClientRect().top - t.top - pad);
      } else {
        const r = el.getBoundingClientRect();
        const top = r.top - t.top;
        const bottom = top + r.height;
        let y = offsetOf(node);
        if (bottom - y > viewport.clientHeight - pad) y = bottom - viewport.clientHeight + pad;
        if (top - y < pad) y = top - pad;
        slide(node, "y", y);
      }
    }
  }
}

export function focusEl(el: HTMLElement | null | undefined) {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  reveal(el);
}

export function move(d: Dir) {
  const root = scope();
  const els = navigable(root);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || els.indexOf(cur) < 0) {
    focusEl(root.querySelector<HTMLElement>("[data-autofocus]") || els[0]);
    return;
  }
  const others = els.filter((el) => el !== cur);
  const i = pickNext(cur.getBoundingClientRect(), others.map((el) => el.getBoundingClientRect()), d);
  if (i >= 0) focusEl(others[i]);
}

/** Focus `key`'s element if it is on screen, else the screen's [data-autofocus], else anything. */
export function autofocus(container: ParentNode = scope(), key?: string | null) {
  const els = navigable(container);
  const byKey = key ? els.filter((el) => el.getAttribute("data-focus-key") === key)[0] : undefined;
  const auto = els.filter((el) => el.hasAttribute("data-autofocus"))[0];
  focusEl(byKey || auto || els[0]);
}

/** Magic Remote / mouse: focus follows the pointer (without sliding anything). */
export function installPointerFocus() {
  document.addEventListener("mouseover", (e) => {
    const el = closest(e.target as Element, "[data-nav]");
    if (!el || el === document.activeElement || !scope().contains(el)) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  });
}
