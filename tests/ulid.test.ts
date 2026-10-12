import { decodeTime } from "ulid";
import { describe, expect, it } from "vitest";
import { bytesToUlid, isUlid, newId, ulidToBytes } from "@/lib/ulid";

describe("ULID <-> BINARY(16)", () => {
  it("round-trips", () => {
    for (let i = 0; i < 200; i++) {
      const id = newId();
      const bytes = ulidToBytes(id);
      expect(bytes).toHaveLength(16);
      expect(bytesToUlid(bytes)).toBe(id);
    }
  });

  it("handles the extremes", () => {
    expect(bytesToUlid(new Uint8Array(16))).toBe("00000000000000000000000000");
    expect(bytesToUlid(new Uint8Array(16).fill(255))).toBe("7ZZZZZZZZZZZZZZZZZZZZZZZZZ");
    expect(Array.from(ulidToBytes("7ZZZZZZZZZZZZZZZZZZZZZZZZZ"))).toEqual(new Array(16).fill(255));
  });

  it("keeps the 48-bit timestamp in the first 6 bytes (big-endian)", () => {
    for (const id of ["01ARZ3NDEKTSV4RRFFQ69G5FAV", newId()]) {
      const ms = ulidToBytes(id).slice(0, 6).reduce((n, x) => n * 256 + x, 0);
      expect(ms).toBe(decodeTime(id));
    }
  });

  it("byte order matches string order, so BINARY(16) sorts by creation time", () => {
    const ids = Array.from({ length: 50 }, newId).sort();
    const hex = ids.map((id) => Buffer.from(ulidToBytes(id)).toString("hex"));
    expect([...hex].sort()).toEqual(hex);
  });

  it("accepts lowercase and rejects junk", () => {
    const id = newId();
    expect(bytesToUlid(ulidToBytes(id.toLowerCase()))).toBe(id);
    expect(isUlid("not-a-ulid")).toBe(false);
    expect(() => ulidToBytes("8ZZZZZZZZZZZZZZZZZZZZZZZZZ")).toThrow();
    expect(() => bytesToUlid(new Uint8Array(15))).toThrow();
  });
});
