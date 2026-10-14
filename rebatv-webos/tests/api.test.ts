import { describe, expect, it } from "vitest";
import { apiUrl, resolveApiBase } from "../src/api";
import { detectPlatform } from "../src/platform";

describe("resolveApiBase", () => {
  it("uses the configured origin when packaged (file://)", () => {
    expect(resolveApiBase("file:", "https://example.tv/")).toBe("https://example.tv");
    expect(resolveApiBase("file:", undefined)).toBe("https://rebatv.bugufi.link");
  });

  it("stays same-origin when hosted (VIDAA, dev server)", () => {
    expect(resolveApiBase("https:", "https://example.tv")).toBe("");
    expect(resolveApiBase("http:", undefined)).toBe("");
  });
});

describe("apiUrl", () => {
  it("prefixes paths and passes absolute URLs through", () => {
    expect(apiUrl("/_next/image?url=x", "https://example.tv")).toBe("https://example.tv/_next/image?url=x");
    expect(apiUrl("https://cdn.example/logo.png", "https://example.tv")).toBe("https://cdn.example/logo.png");
  });
});

describe("detectPlatform", () => {
  it("recognises LG and Hisense user agents", () => {
    expect(detectPlatform("Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/53.0.2785.34 Safari/537.36 WebAppManager")).toBe("webos");
    expect(detectPlatform("Mozilla/5.0 (Linux; VIDAA/6.0(Hisense;SmartTV;55A6K)) AppleWebKit/537.36 Chrome/94.0 Safari/537.36")).toBe("vidaa");
    expect(detectPlatform("Mozilla/5.0 (Macintosh) Chrome/130.0 Safari/537.36")).toBe("browser");
  });
});
