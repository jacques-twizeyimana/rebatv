import { describe, expect, it } from "vitest";
import { buildLineup, listMarkets, resolveMarket, zapTarget } from "@/lib/lineup";
import { catalog } from "./fixtures";

describe("buildLineup", () => {
  it("numbers locals from 1, then international, then regional neighbours from 101", () => {
    const l = buildLineup(catalog(), "rw")!;
    expect(l.local.map((c) => [c.name, c.num])).toEqual([
      ["RTV", 1],
      ["TV10", 2],
      ["Isango", 3],
      ["TV1", 4],
    ]);
    expect(l.international.map((c) => [c.name, c.num])).toEqual([
      ["Al Jazeera", 101],
      ["DW", 102],
      ["NTV Uganda", 103],
      ["Citizen", 104],
    ]);
    expect(l.channels).toHaveLength(8);
  });

  it("tags non-local channels with their country", () => {
    const l = buildLineup(catalog(), "rw")!;
    expect(l.local[0].tag).toBe("News & general");
    expect(l.international[0].tag).toBe("World news · Qatar");
  });

  it("builds Featured as up to 2 local picks, then others in admin order, max 5", () => {
    const l = buildLineup(catalog(), "rw")!;
    expect(l.featured.map((c) => c.name)).toEqual(["TV10", "Isango", "DW", "Citizen", "Al Jazeera"]);
  });

  it("uses the configured hero, else the first local channel", () => {
    expect(buildLineup(catalog(), "rw")!.hero?.name).toBe("RTV");
    expect(buildLineup(catalog(), "ke")!.hero?.name).toBe("Citizen");
  });

  it("re-numbers per market", () => {
    const ug = buildLineup(catalog(), "ug")!;
    expect(ug.local.map((c) => [c.name, c.num])).toEqual([["NTV Uganda", 1]]);
    expect(ug.channels.find((c) => c.name === "RTV")!.num).toBeGreaterThanOrEqual(101);
  });

  it("falls back to the first market for unknown codes", () => {
    expect(resolveMarket(catalog(), "us")).toMatchObject({ market: { code: "rw" }, exact: false });
    expect(resolveMarket(catalog(), "KE")).toMatchObject({ market: { code: "ke" }, exact: true });
    expect(listMarkets(catalog()).map((m) => [m.code, m.localCount])).toEqual([
      ["rw", 4],
      ["ug", 1],
      ["ke", 1],
    ]);
  });
});

describe("zapTarget", () => {
  const list = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  it("moves and wraps", () => {
    expect(zapTarget(list, "a", 1)?.slug).toBe("b");
    expect(zapTarget(list, "c", 1)?.slug).toBe("a");
    expect(zapTarget(list, "a", -1)?.slug).toBe("c");
    expect(zapTarget([], "a", 1)).toBeUndefined();
  });
});
