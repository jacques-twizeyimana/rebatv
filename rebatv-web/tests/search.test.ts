import { describe, expect, it } from "vitest";
import { buildLineup } from "@/lib/lineup";
import { filterChannels, parseSearchState } from "@/lib/search";
import { catalog } from "./fixtures";

const channels = buildLineup(catalog(), "rw")!.channels;
const names = (q: string, genre = "All", group: "local" | "intl" | null = null) =>
  filterChannels(channels, { q, genre, group }).map((c) => c.name);

describe("filterChannels", () => {
  it("matches name, genre and country, all terms required", () => {
    expect(names("tv1")).toEqual(["TV10", "TV1"]);
    expect(names("germany")).toEqual(["DW"]);
    expect(names("world news qatar")).toEqual(["Al Jazeera"]);
  });

  it("filters by genre chip and group", () => {
    expect(names("", "News")).toEqual(["RTV", "Al Jazeera", "DW", "NTV Uganda", "Citizen"]);
    expect(names("", "Sports")).toEqual(["Isango"]);
    expect(names("", "All", "local")).toHaveLength(4);
    expect(names("", "News", "intl")).toEqual(["Al Jazeera", "DW", "NTV Uganda", "Citizen"]);
  });
});

describe("parseSearchState", () => {
  it("sanitises URL params", () => {
    expect(parseSearchState(new URLSearchParams("q=tv&genre=Sports&group=local"))).toEqual({ q: "tv", genre: "Sports", group: "local" });
    expect(parseSearchState(new URLSearchParams("genre=Hacking&group=x"))).toEqual({ q: "", genre: "All", group: null });
  });
});
