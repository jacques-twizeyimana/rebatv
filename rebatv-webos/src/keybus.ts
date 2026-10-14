import { useEffect, useRef } from "preact/hooks";
import type { KeyResult } from "./keys";

/**
 * Screens claim remote keys before the app's defaults (spatial navigation, BACK, number entry).
 * The most recently registered active handler runs first; returning true consumes the key.
 */
export type KeyHandler = (key: KeyResult, e: KeyboardEvent) => boolean | void;

const handlers: KeyHandler[] = [];

export function dispatchKey(key: KeyResult, e: KeyboardEvent): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i](key, e)) return true;
  }
  return false;
}

export function useKeys(handler: KeyHandler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const h: KeyHandler = (k, e) => ref.current(k, e);
    handlers.push(h);
    return () => {
      const i = handlers.indexOf(h);
      if (i >= 0) handlers.splice(i, 1);
    };
  }, [active]);
}
