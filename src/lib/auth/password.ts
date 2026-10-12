import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD_LENGTH = 12;

// OWASP-recommended argon2id parameters (19 MiB, t=2, p=1). Algorithm.Argon2id === 2.
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Verifying against a throwaway hash when the email is unknown keeps response timing the same
// as for a wrong password, so admin emails can't be enumerated.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}
