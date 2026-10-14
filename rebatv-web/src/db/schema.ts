import {
  boolean,
  char,
  customType,
  datetime,
  index,
  int,
  mysqlTable,
  smallint,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { bytesToUlid, ulidToBytes } from "../lib/ulid";

/** ULID stored as BINARY(16); exposed to the app as its 26-char string form. */
export const ulidBinary = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return "binary(16)";
  },
  toDriver(value) {
    return Buffer.from(ulidToBytes(value));
  },
  fromDriver(value) {
    return bytesToUlid(value);
  },
});

const timestamps = {
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
};

export const countries = mysqlTable("countries", {
  code: char("code", { length: 2 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  /** Markets appear in the location picker and get their own /{code} home page. */
  isMarket: boolean("is_market").notNull().default(false),
  heroChannelId: ulidBinary("hero_channel_id"),
  heroBlurb: varchar("hero_blurb", { length: 280 }),
  sortOrder: int("sort_order").notNull().default(0),
});

export const channels = mysqlTable(
  "channels",
  {
    id: ulidBinary("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    shortName: varchar("short_name", { length: 12 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 400 }),
    genre: varchar("genre", { length: 60 }).notNull(),
    hue: smallint("hue").notNull().default(210),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code, { onUpdate: "cascade", onDelete: "restrict" }),
    streamUrl: varchar("stream_url", { length: 600 }),
    logoUrl: varchar("logo_url", { length: 600 }),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("channels_country_idx").on(t.countryCode, t.sortOrder)],
);

export const featuredChannels = mysqlTable("featured_channels", {
  channelId: ulidBinary("channel_id")
    .primaryKey()
    .references(() => channels.id, { onDelete: "cascade" }),
  position: int("position").notNull().default(0),
});

export const admins = mysqlTable("admins", {
  id: ulidBinary("id").primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  lastLoginAt: datetime("last_login_at", { mode: "date" }),
  createdAt: timestamps.createdAt,
});

export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    ip: varchar("ip", { length: 64 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.createdAt), index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export type ChannelRow = typeof channels.$inferSelect;
export type CountryRow = typeof countries.$inferSelect;
