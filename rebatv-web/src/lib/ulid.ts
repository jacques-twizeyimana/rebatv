import { isValid, ulid } from "ulid";

// Crockford base32, as used by ULID. A ULID is 128 bits: 48-bit time + 80-bit randomness,
// written as 26 chars. Stored in MariaDB as BINARY(16), big-endian, so byte order == sort order.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LOOKUP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  LOOKUP[ALPHABET[i]] = i;
  LOOKUP[ALPHABET[i].toLowerCase()] = i;
}

export function newId(): string {
  return ulid();
}

export function isUlid(value: unknown): value is string {
  // isValid() doesn't reject values above 2^128 (first char > 7), which wouldn't fit in BINARY(16).
  return typeof value === "string" && value.length === 26 && isValid(value) && value[0] <= "7";
}

export function ulidToBytes(id: string): Uint8Array {
  if (!isUlid(id)) throw new TypeError(`Invalid ULID: ${id}`);
  let n = 0n;
  for (const ch of id) n = (n << 5n) | BigInt(LOOKUP[ch]);
  const out = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

export function bytesToUlid(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new TypeError(`Expected 16 bytes, got ${bytes.length}`);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = "";
  for (let i = 0; i < 26; i++) {
    out = ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}
