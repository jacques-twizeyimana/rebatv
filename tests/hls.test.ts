import { describe, expect, it } from "vitest";
import { hlsProxyPath, rewritePlaylist } from "@/lib/hls";

const proxy = (abs: string) => hlsProxyPath("rtv", abs);

describe("rewritePlaylist", () => {
  it("sends variant playlists through the proxy (relative names, as Wowza and TV1 use)", () => {
    const master = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      '#EXT-X-STREAM-INF:BANDWIDTH=712745,CODECS="avc1.42c01f,mp4a.40.2",RESOLUTION=854x480',
      "chunklist_w2095706133.m3u8",
      "",
    ].join("\r\n");
    const out = rewritePlaylist(master, "https://5c46fa289c89f.streamlock.net:443/rtv25/rtv/playlist.m3u8", proxy).split("\n");
    expect(out[3]).toBe(
      `/hls/rtv/chunklist_w2095706133.m3u8?u=${encodeURIComponent("https://5c46fa289c89f.streamlock.net/rtv25/rtv/chunklist_w2095706133.m3u8")}`,
    );
    expect(out[2]).toContain("RESOLUTION=854x480");
  });

  it("treats the line after EXT-X-STREAM-INF as a playlist even without .m3u8", () => {
    const out = rewritePlaylist("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nvariant?token=1\n", "https://a.example/live/master.m3u8", proxy);
    expect(out).toContain(`/hls/rtv/variant?u=${encodeURIComponent("https://a.example/live/variant?token=1")}`);
  });

  it("makes media segments, keys and init sections absolute (fetched directly, not proxied)", () => {
    const media = [
      "#EXTM3U",
      "#EXT-X-TARGETDURATION:10",
      '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
      '#EXT-X-MAP:URI="/init.mp4"',
      "#EXTINF:10.0,",
      "media_w1_40482.ts",
      "#EXTINF:10.0,",
      "https://cdn.example/abs.ts",
    ].join("\n");
    const out = rewritePlaylist(media, "https://s.example/rtv25/rtv/chunklist.m3u8", proxy).split("\n");
    expect(out[2]).toBe('#EXT-X-KEY:METHOD=AES-128,URI="https://s.example/rtv25/rtv/key.bin"');
    expect(out[3]).toBe('#EXT-X-MAP:URI="https://s.example/init.mp4"');
    expect(out[5]).toBe("https://s.example/rtv25/rtv/media_w1_40482.ts");
    expect(out[7]).toBe("https://cdn.example/abs.ts");
  });

  it("proxies alternate renditions referenced by EXT-X-MEDIA", () => {
    const out = rewritePlaylist('#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="audio/en.m3u8"', "https://s.example/x/master.m3u8", proxy);
    expect(out).toBe(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="/hls/rtv/en.m3u8?u=${encodeURIComponent("https://s.example/x/audio/en.m3u8")}"`);
  });

  it("builds the master path without a query", () => {
    expect(hlsProxyPath("tv10")).toBe("/hls/tv10/playlist.m3u8");
  });
});
