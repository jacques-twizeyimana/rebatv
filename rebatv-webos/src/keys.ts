/**
 * Remote-control keys, normalised. TV engines differ: some only set keyCode (webOS BACK = 461,
 * Tizen BACK = 10009, CH± = 427/428), old Chromium (webOS 4 = Chrome 53) sets `key` for most keys
 * but not the TV-specific ones, and VIDAA sends BACK as Backspace (8).
 */

export type Action =
  | "up"
  | "down"
  | "left"
  | "right"
  | "ok"
  | "back"
  /** Backspace: BACK on VIDAA remotes, "delete a letter" on a keyboard in Search. */
  | "backspace"
  | "chUp"
  | "chDown"
  | "digit"
  | "play"
  | "pause"
  | "playPause"
  | "stop";

export type KeyResult = { action: Action; digit?: number } | null;

type KeyLike = { key?: string; keyCode?: number; which?: number };

const BY_KEY: Record<string, Action> = {
  ArrowUp: "up",
  Up: "up",
  ArrowDown: "down",
  Down: "down",
  ArrowLeft: "left",
  Left: "left",
  ArrowRight: "right",
  Right: "right",
  Enter: "ok",
  Accept: "ok",
  Escape: "back",
  Esc: "back",
  GoBack: "back",
  BrowserBack: "back",
  Back: "back",
  Backspace: "backspace",
  ChannelUp: "chUp",
  PageUp: "chUp",
  ChannelDown: "chDown",
  PageDown: "chDown",
  MediaPlay: "play",
  MediaPause: "pause",
  MediaPlayPause: "playPause",
  MediaStop: "stop",
};

const BY_CODE: Record<number, Action> = {
  38: "up",
  40: "down",
  37: "left",
  39: "right",
  13: "ok",
  27: "back",
  461: "back", // webOS
  10009: "back", // Tizen
  8: "backspace",
  33: "chUp",
  34: "chDown",
  427: "chUp",
  428: "chDown",
  415: "play",
  19: "pause",
  179: "playPause",
  463: "playPause",
  413: "stop",
};

export function keyAction(e: KeyLike): KeyResult {
  const code = e.keyCode || e.which || 0;
  if (e.key && e.key.length === 1 && e.key >= "0" && e.key <= "9") return { action: "digit", digit: Number(e.key) };
  if (code >= 48 && code <= 57 && !e.key) return { action: "digit", digit: code - 48 };
  if (code >= 96 && code <= 105) return { action: "digit", digit: code - 96 };
  const byKey = e.key ? BY_KEY[e.key] : undefined;
  if (byKey) return { action: byKey };
  const byCode = BY_CODE[code];
  return byCode ? { action: byCode } : null;
}
