import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

declare global {
  var __rebaPool: mysql.Pool | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = mysql.createPool({
    uri: url,
    // Public pages are prerendered and served from cache, so the database sees little traffic.
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 30_000,
    enableKeepAlive: true,
    timezone: "Z",
  });
  // On Vercel Fluid compute, release idle connections before the instance is suspended.
  // The helper recognises mysql2's core pool, not the promise wrapper around it.
  attachDatabasePool(pool.pool);
  return pool;
}

// Reuse the pool across hot reloads in dev and across invocations on a warm instance.
const pool = globalThis.__rebaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__rebaPool = pool;

export const db: MySql2Database<typeof schema> = drizzle(pool, { schema, mode: "default" });
