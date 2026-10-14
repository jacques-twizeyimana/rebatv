import { describe, expect, it } from "vitest";
import { pickNext, type Rect } from "../src/nav";

const r = (left: number, top: number, width = 100, height = 60): Rect => ({ left, top, width, height });

// A hero button above two rows of three cards.
const hero = r(0, 0, 200, 60);
const row1 = [r(0, 200), r(130, 200), r(260, 200)];
const row2 = [r(0, 400), r(130, 400), r(260, 400)];

describe("pickNext", () => {
  it("moves along a row", () => {
    const others = [hero, row1[1], row1[2], ...row2];
    expect(others[pickNext(row1[0], others, "r")]).toBe(row1[1]);
    expect(pickNext(row1[0], others, "l")).toBe(-1);
  });

  it("moves down to the nearest card in the next row", () => {
    const others = [hero, row1[0], row1[2], ...row2];
    expect(others[pickNext(row1[1], others, "d")]).toBe(row2[1]);
  });

  it("moves up from a row to the hero", () => {
    const others = [hero, row1[1], row1[2], ...row2];
    expect(others[pickNext(row1[0], others, "u")]).toBe(hero);
  });

  it("prefers the same row over a closer diagonal", () => {
    const others = [r(130, 200), r(110, 260)];
    expect(pickNext(r(0, 200), others, "r")).toBe(0);
  });
});
