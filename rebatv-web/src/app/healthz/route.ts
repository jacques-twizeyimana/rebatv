import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db/client";

/**
 * Liveness check for deploy/deploy.sh (and uptime monitors): 200 when the server is up and the
 * database answers, 503 otherwise. Deliberately independent of content, so an empty catalogue
 * (e.g. before the first seed) doesn't fail a deploy.
 */
export async function GET() {
  await connection(); // never prerender: this must run on every request
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  try {
    await db.execute(sql`SELECT 1`);
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "database unreachable" }), { status: 503, headers });
  }
}
