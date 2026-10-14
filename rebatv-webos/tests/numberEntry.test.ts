import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNumberEntry } from "../src/numberEntry";

describe("createNumberEntry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("commits after a pause", () => {
    const commit = vi.fn();
    const shown: string[] = [];
    const e = createNumberEntry((v) => shown.push(v), commit, 1500);
    e.push(1);
    e.push(2);
    expect(e.value()).toBe("12");
    vi.advanceTimersByTime(1400);
    e.push(0); // "120": each digit restarts the wait…
    expect(commit).toHaveBeenCalledWith(120); // …but three digits commit at once
    expect(shown[shown.length - 1]).toBe("");
  });

  it("commits two digits once the timer runs out", () => {
    const commit = vi.fn();
    const e = createNumberEntry(() => {}, commit, 1500);
    e.push(4);
    e.push(2);
    vi.advanceTimersByTime(1499);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledWith(42);
    expect(e.value()).toBe("");
  });

  it("ignores 0 and can be cancelled", () => {
    const commit = vi.fn();
    const e = createNumberEntry(() => {}, commit, 1500);
    e.push(0);
    vi.advanceTimersByTime(2000);
    e.push(5);
    e.cancel();
    vi.advanceTimersByTime(2000);
    expect(commit).not.toHaveBeenCalled();
  });
});
