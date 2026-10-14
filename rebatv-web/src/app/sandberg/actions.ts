"use server";

import { and, asc, count, eq, gt, lt, or, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { admins, channels, countries, featuredChannels, loginAttempts } from "@/db/schema";
import { endSession, requireAdmin, startSession } from "@/lib/auth/dal";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { isUlid, newId } from "@/lib/ulid";
import {
  channelSchema,
  countrySchema,
  fieldErrors,
  formValues,
  loginSchema,
  type FormState,
} from "@/lib/validation";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}

function idFrom(fd: FormData, key = "id"): string {
  const id = String(fd.get(key) ?? "");
  if (!isUlid(id)) throw new Error("Invalid id");
  return id;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email } };

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
  const since = new Date(Date.now() - WINDOW_MS);

  const [{ n }] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(gt(loginAttempts.createdAt, since), or(eq(loginAttempts.ip, ip), eq(loginAttempts.email, parsed.data.email))));
  if (n >= MAX_ATTEMPTS) {
    return { message: "Too many sign-in attempts. Wait 15 minutes and try again.", values: { email } };
  }

  const [admin] = await db.select().from(admins).where(eq(admins.email, parsed.data.email)).limit(1);
  // Always run one argon2 verify so timing doesn't reveal whether the email exists.
  const valid = await verifyPassword(admin?.passwordHash ?? (await getDummyHash()), parsed.data.password);

  if (!admin || !valid) {
    await db.insert(loginAttempts).values({ ip, email: parsed.data.email });
    await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
    return { message: "Email or password is incorrect.", values: { email } };
  }

  await db.delete(loginAttempts).where(eq(loginAttempts.email, admin.email));
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
  await startSession({ id: admin.id, email: admin.email });
  redirect("/sandberg");
}

export async function logout() {
  await endSession();
  redirect("/sandberg/login");
}

// ── Channels ───────────────────────────────────────────────────────────────────

export async function saveChannel(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const rawId = String(fd.get("id") ?? "");
  const id = rawId ? idFrom(fd) : null;
  const values = formValues(fd);
  const parsed = channelSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const data = parsed.data;
  const [country] = await db.select({ code: countries.code }).from(countries).where(eq(countries.code, data.countryCode)).limit(1);
  if (!country) return { errors: { countryCode: "Unknown country" }, values };

  try {
    if (id) {
      await db.update(channels).set(data).where(eq(channels.id, id));
    } else {
      await db.insert(channels).values({ id: newId(), ...data });
    }
  } catch (err) {
    if (isDuplicate(err)) return { errors: { slug: "Another channel already uses this slug" }, values };
    throw err;
  }

  updateTag(CATALOG_TAG);
  if (id) return { ok: true, message: "Channel saved.", values };
  redirect("/sandberg?saved=1");
}

export async function deleteChannel(fd: FormData) {
  await requireAdmin();
  const id = idFrom(fd);
  await db.transaction(async (tx) => {
    await tx.update(countries).set({ heroChannelId: null }).where(eq(countries.heroChannelId, id));
    await tx.delete(featuredChannels).where(eq(featuredChannels.channelId, id));
    await tx.delete(channels).where(eq(channels.id, id));
  });
  updateTag(CATALOG_TAG);
  redirect("/sandberg?deleted=1");
}

export async function toggleChannel(fd: FormData) {
  await requireAdmin();
  const id = idFrom(fd);
  await db.update(channels).set({ isActive: sql`NOT ${channels.isActive}` }).where(eq(channels.id, id));
  updateTag(CATALOG_TAG);
}

// ── Featured ───────────────────────────────────────────────────────────────────

async function featuredIds(): Promise<string[]> {
  const rows = await db.select({ id: featuredChannels.channelId }).from(featuredChannels).orderBy(asc(featuredChannels.position));
  return rows.map((r) => r.id);
}

async function writeFeaturedOrder(ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(featuredChannels).set({ position: i + 1 }).where(eq(featuredChannels.channelId, id));
    }
  });
}

export async function addFeatured(fd: FormData) {
  await requireAdmin();
  const id = idFrom(fd, "channelId");
  const ids = await featuredIds();
  if (!ids.includes(id)) {
    await db.insert(featuredChannels).values({ channelId: id, position: ids.length + 1 });
    updateTag(CATALOG_TAG);
  }
}

export async function removeFeatured(fd: FormData) {
  await requireAdmin();
  const id = idFrom(fd, "channelId");
  await db.delete(featuredChannels).where(eq(featuredChannels.channelId, id));
  await writeFeaturedOrder((await featuredIds()).filter((x) => x !== id));
  updateTag(CATALOG_TAG);
}

export async function moveFeatured(fd: FormData) {
  await requireAdmin();
  const id = idFrom(fd, "channelId");
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const ids = await featuredIds();
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await writeFeaturedOrder(ids);
  updateTag(CATALOG_TAG);
}

// ── Countries ──────────────────────────────────────────────────────────────────

export async function saveCountry(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(fd);
  const isNew = fd.get("mode") === "create";
  const parsed = countrySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { code, heroChannelId, ...rest } = parsed.data;

  if (heroChannelId) {
    if (!isUlid(heroChannelId)) return { errors: { heroChannelId: "Invalid channel" }, values };
    const [hero] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, heroChannelId), eq(channels.countryCode, code)))
      .limit(1);
    if (!hero) return { errors: { heroChannelId: "Pick a channel from this country" }, values };
  }

  try {
    if (isNew) await db.insert(countries).values({ code, heroChannelId, ...rest });
    else await db.update(countries).set({ heroChannelId, ...rest }).where(eq(countries.code, code));
  } catch (err) {
    if (isDuplicate(err)) return { errors: { code: "This country already exists" }, values };
    throw err;
  }
  updateTag(CATALOG_TAG);
  return { ok: true, message: isNew ? `${rest.name} added.` : `${rest.name} saved.`, values: isNew ? {} : values };
}

export async function deleteCountry(fd: FormData) {
  await requireAdmin();
  const code = String(fd.get("code") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("Invalid code");
  const [{ n }] = await db.select({ n: count() }).from(channels).where(eq(channels.countryCode, code));
  if (n > 0) redirect(`/sandberg/countries?error=${encodeURIComponent(`${code} still has ${n} channel(s)`)}`);
  await db.delete(countries).where(eq(countries.code, code));
  updateTag(CATALOG_TAG);
}
