import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { admins } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/site";
import { SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

export type Admin = { id: string; email: string };

/** Verifies the session cookie and that the admin still exists. Memoised per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [row] = await db
    .select({ id: admins.id, email: admins.email })
    .from(admins)
    .where(eq(admins.id, session.sub))
    .limit(1);
  return row ?? null;
});

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/sandberg/login");
  return admin;
}

export async function startSession(admin: Admin) {
  const token = await signSession({ sub: admin.id, email: admin.email });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/sandberg",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/sandberg" });
}
