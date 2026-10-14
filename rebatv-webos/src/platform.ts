/**
 * TV platform detection and the few platform calls the app needs.
 *
 * - LG webOS: packaged app (file://). `appinfo.json` sets disableBackHistoryAPI, so BACK (461)
 *   reaches the page and we decide when to leave; webOS.platformBack() (webOSTV.js) or
 *   window.close() exits.
 * - Hisense VIDAA: hosted app (https://…/tv/). BACK arrives as Backspace (8); window.close() exits.
 */

type WebOSGlobal = { platformBack?: () => void };

export type Platform = "webos" | "vidaa" | "browser";

export function detectPlatform(ua: string): Platform {
  if (/Web0S|webOS|NetCast/i.test(ua)) return "webos";
  if (/VIDAA|Hisense/i.test(ua)) return "vidaa";
  return "browser";
}

export const platform: Platform = typeof navigator === "undefined" ? "browser" : detectPlatform(navigator.userAgent);

/** Leave the app (back to the TV's launcher). In a desktop browser this is a no-op. */
export function exitApp() {
  const w = window as unknown as { webOS?: WebOSGlobal };
  if (w.webOS && typeof w.webOS.platformBack === "function") {
    w.webOS.platformBack();
    return;
  }
  window.close();
}
