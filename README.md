# rebaTV

Free live TV for East Africa, built for big TVs (D-pad / remote navigation) and laptops.
Next.js 16 (App Router, Cache Components) is both the frontend and the backend; channels live in MariaDB.

## Stack

- **Next.js 16.4** with `cacheComponents`, React 19, TypeScript, CSS Modules (no UI framework)
- **MariaDB** via Drizzle ORM + mysql2; IDs are ULIDs stored as `BINARY(16)` (`src/db/schema.ts`, `src/lib/ulid.ts`)
- **hls.js** (light build), loaded only on watch pages; native HLS is the fallback
- **jose** (admin session JWT) + **argon2id** passwords, **zod** validation

## Local setup

```bash
pnpm install
cp .env.example .env.local        # then set SESSION_SECRET (openssl rand -base64 48)
docker compose up -d              # MariaDB 11.4 on :3306
pnpm db:migrate
pnpm db:seed                      # Rwanda + 10 channels with live HLS streams and logos (SEED_RESET=1 to wipe first)
pnpm admin:create                 # prompts for email + password (or ADMIN_EMAIL / ADMIN_PASSWORD)
pnpm dev                          # http://localhost:3000, admin at /sandberg
```

Checks: `pnpm test` (ULID binary round-trip, lineup numbering/featured rules, search), `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## How it fits together

| Route | What | Rendering |
| --- | --- | --- |
| `/` | Rewritten by `src/proxy.ts` to `/{cc}`: `rtv_country` cookie → `x-vercel-ip-country` → `DEFAULT_MARKET` (`rw`) | — |
| `/[country]` | Home: hero, Local / Featured / International rows | Static, revalidated by tag |
| `/[country]/search` | On-screen keyboard search; filters sync to `?q=&genre=&group=` | Static shell, client filtering |
| `/[country]/watch/[slug]` | Full-screen player, CH+/CH− zapping, auto-hiding overlay | Static per channel × market |
| `/hls/[slug]/*.m3u8` | Same-origin proxy for HLS **playlists** (not video); see below | Dynamic, CDN-cached 2–30 s |
| `/sandberg/**` | Admin: channels, featured order, countries / heroes | Dynamic, `noindex`, `no-store` |

- **Caching.** `getCatalog()` (`src/lib/data/catalog.ts`) reads all channels, countries and the featured list in one `"use cache"` call tagged `catalog` (custom `cacheLife` profile in `next.config.ts`). Every admin mutation calls `updateTag("catalog")`, so the next request re-renders with fresh data and the result is cached again. The database is only hit after an edit or at build time.
- **Channel numbers** are per market: local channels 1…n, then world channels and regional neighbours from 101 (`src/lib/lineup.ts`, ported from the design).
- **Non-market countries** (e.g. a visitor geolocated to `us`) render the default market with `canonical` → `/rw` and `noindex`.
- **TV navigation.** `src/components/tv/SpatialNav.tsx` ports the design's spatial `move()` scoring. Everything focusable is a real `<a>`/`<button>` with `data-nav`, so Tab, screen readers and no-JS links still work. BACK keys (Escape, Backspace, Tizen `10009`, webOS `461`) return Home and restore the last focused card; the player handles ↑/↓, PageUp/PageDown, ChannelUp/Down (Tizen `427/428`).
- **Old TV browsers.** `browserslist` targets Chrome 87 (≈2021+ LG/Samsung), and the CSS avoids `aspect-ratio`, `:has()` and nesting. The root size scales with the viewport in pure CSS (≈16px at 1920 CSS px, the usual TV viewport), with a `rem` term so browser zoom still works.
- **Playlist proxy.** The player uses hls.js with playlists fetched through `/hls/{slug}/…` (`src/app/hls/[slug]/[file]/route.ts`): the server fetches each `.m3u8` uncompressed and rewrites it so nested playlists stay on the proxy and video segments point straight at the broadcaster (no video passes through the app). This avoids broadcaster gzip that some clients fail to decode (`ERR_CONTENT_DECODING_FAILED`) and missing CORS on playlists. It only fetches a published channel's stream URL plus nested playlist URLs it signed itself while rewriting that channel's playlists (HMAC with `HLS_SIGNING_SECRET`, falling back to `SESSION_SECRET`), so it follows playlists across a broadcaster's CDNs but can't be used as an open proxy. If hls.js can't run or a segment is blocked (e.g. no CORS on segments), the player falls back to native HLS with the broadcaster's URL.
- **Partial Prefetching is off** on purpose (see the comment in `next.config.ts`): with it on, channels added after a deploy were first served from the generic App Shell with generic metadata.

## Admin (`/sandberg`)

- Sign-in is checked twice: `proxy.ts` is only a first gate; every admin page and server action calls `requireAdmin()` (`src/lib/auth/dal.ts`), which verifies the JWT and that the admin still exists.
- Session: HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie scoped to `/sandberg`, valid 8 hours.
- Login is rate-limited to 10 failed attempts per 15 minutes per IP or email (`login_attempts` table), and unknown emails cost the same argon2 work as wrong passwords, so emails can't be probed.
- Stream URLs and logo URLs must be `https://` (mixed content would be blocked on the HTTPS site).

## Deploying to Vercel

1. Create a MariaDB database (utf8mb4) reachable from Vercel and run `pnpm db:migrate` against it.
2. Set `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` (and optionally `DEFAULT_MARKET`) for **Production and Preview, including build time**: pages are prerendered from the database during `next build`.
3. Create the first admin from your machine: `DATABASE_URL=… pnpm admin:create`.

The pool (`src/db/client.ts`) is small (5 connections) and registered with `attachDatabasePool` so Fluid compute releases idle connections.
