import { describe, expect, it } from "vitest";
import { keyAction } from "../src/keys";

describe("keyAction", () => {
  it("maps arrows and OK by key or keyCode", () => {
    expect(keyAction({ key: "ArrowUp", keyCode: 38 })).toEqual({ action: "up" });
    expect(keyAction({ keyCode: 37 })).toEqual({ action: "left" });
    expect(keyAction({ key: "Enter", keyCode: 13 })).toEqual({ action: "ok" });
  });

  it("recognises BACK on every platform", () => {
    expect(keyAction({ keyCode: 461 })).toEqual({ action: "back" }); // webOS
    expect(keyAction({ key: "Unidentified", keyCode: 461 })).toEqual({ action: "back" });
    expect(keyAction({ keyCode: 10009 })).toEqual({ action: "back" }); // Tizen
    expect(keyAction({ key: "Escape", keyCode: 27 })).toEqual({ action: "back" });
    expect(keyAction({ key: "Backspace", keyCode: 8 })).toEqual({ action: "backspace" }); // VIDAA
  });

  it("maps channel up/down", () => {
    expect(keyAction({ keyCode: 427 })).toEqual({ action: "chUp" });
    expect(keyAction({ keyCode: 428 })).toEqual({ action: "chDown" });
    expect(keyAction({ key: "PageUp", keyCode: 33 })).toEqual({ action: "chUp" });
    expect(keyAction({ key: "ChannelDown" })).toEqual({ action: "chDown" });
  });

  it("reads digits from the top row and the numpad", () => {
    expect(keyAction({ key: "7", keyCode: 55 })).toEqual({ action: "digit", digit: 7 });
    expect(keyAction({ keyCode: 48 })).toEqual({ action: "digit", digit: 0 });
    expect(keyAction({ keyCode: 101 })).toEqual({ action: "digit", digit: 5 });
    // Shift+9 is "(" on a keyboard, not a channel digit.
    expect(keyAction({ key: "(", keyCode: 57 })).toBeNull();
  });

  it("maps media keys and ignores the rest", () => {
    expect(keyAction({ keyCode: 415 })).toEqual({ action: "play" });
    expect(keyAction({ keyCode: 19 })).toEqual({ action: "pause" });
    expect(keyAction({ keyCode: 413 })).toEqual({ action: "stop" });
    expect(keyAction({ key: "a", keyCode: 65 })).toBeNull();
  });
});
