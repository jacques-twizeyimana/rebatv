/**
 * Creates (or resets the password of) an admin for /sandberg.
 *
 *   pnpm admin:create                         # interactive
 *   ADMIN_EMAIL=a@b.c ADMIN_PASSWORD=... pnpm admin:create
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { admins } from "../src/db/schema";
import { newId } from "../src/lib/ulid";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/auth/password";

async function main() {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    const rl = createInterface({ input: stdin, output: stdout });
    email ||= (await rl.question("Admin email: ")).trim();
    password ||= await rl.question(`Password (min ${MIN_PASSWORD_LENGTH} chars): `);
    rl.close();
  }
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, timezone: "Z" });
  const db = drizzle(conn);
  const passwordHash = await hashPassword(password);
  await db
    .insert(admins)
    .values({ id: newId(), email, passwordHash })
    .onDuplicateKeyUpdate({ set: { passwordHash } });
  console.log(`Admin ${email} is ready. Sign in at /sandberg`);
  await conn.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
