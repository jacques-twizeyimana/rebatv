import { describe, expect, it } from "vitest";
import { apiLogo, toApiLineup } from "@/lib/api";
import { buildLineup } from "@/lib/lineup";
import { catalog } from "./fixtures";

describe("toApiLineup", () => {
  it("lists every channel once and the rows as ids", () => {
    const l = buildLineup(catalog(), "rw")!;
    const api = toApiLineup(l, true);
    expect(api.version).toBe(1);
    expect(api.channels.map((c) => c.num)).toEqual(l.channels.map((c) => c.num));
    expect(api.rows.local).toEqual(l.local.map((c) => c.id));
    expect(api.rows.featured).toEqual(l.featured.map((c) => c.id));
    expect(api.hero).toBe(l.hero!.id);
    expect(api.channels[0]).not.toHaveProperty("logoUrl");
  });

  it("keeps the exact flag for non-market fallbacks", () => {
    expect(toApiLineup(buildLineup(catalog(), "us")!, false).exact).toBe(false);
  });
});

describe("apiLogo", () => {
  it("routes allowlisted raster logos through the image optimizer", () => {
    expect(apiLogo("https://i.imgur.com/abc.png")).toBe("/_next/image?url=https%3A%2F%2Fi.imgur.com%2Fabc.png&w=256&q=75");
  });

  it("leaves other logos and SVGs as they are", () => {
    expect(apiLogo("https://example.com/logo.png")).toBe("https://example.com/logo.png");
    expect(apiLogo("https://i.imgur.com/abc.svg")).toBe("https://i.imgur.com/abc.svg");
    expect(apiLogo(null)).toBeNull();
  });
});
