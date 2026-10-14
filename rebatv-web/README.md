# rebaTV · web

Free live TV for East Africa, built for big TVs (D-pad / remote navigation) and laptops.
Next.js 16 (App Router, Cache Components) is both the frontend and the backend; channels live in MariaDB.
It also serves the JSON API and the HLS playlist proxy used by the TV app in [`../rebatv-webos`](../rebatv-webos).

## Stack

- **Next.js 16.4** with `cacheComponents`, React 19, TypeScript, CSS Modules (no UI framework)
- **MariaDB** via Drizzle ORM + mysql2; IDs are ULIDs stored as `BINARY(16)` (`src/db/schema.ts`, `src/lib/ulid.ts`)
- **hls.js** (light build), loaded only on watch pages; native HLS is the fallback
- **jose** (admin session JWT) + **argon2id** passwords, **zod** validation

## Local setup

```bash
cd rebatv-web
pnpm install
cp .env.example .env.local        # then set SESSION_SECRET (openssl rand -base64 48)
docker compose up -d              # MariaDB 11.4 on :3306
pnpm db:migrate
pnpm db:seed                      # Rwanda + 43 channels with live HLS streams and logos (SEED_RESET=1 to wipe first)
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
| `/api/v1/lineup/[country]` | JSON lineup for the TV apps (markets, hero, rows, channels); see below | Static per market, revalidated by tag |
| `/api/v1/locate` | `{ country, market }` from the visitor's geo header, for a TV app's first launch | Dynamic, `no-store` |
| `/tv/index.html` | Hosted build of the TV app (for VIDAA), copied into `public/tv` by `deploy.sh` | Static file |
| `/sandberg/**` | Admin: channels, featured order, countries / heroes | Dynamic, `noindex`, `no-store` |

- **Caching.** `getCatalog()` (`src/lib/data/catalog.ts`) reads all channels, countries and the featured list in one `"use cache"` call tagged `catalog` (custom `cacheLife` profile in `next.config.ts`). Every admin mutation calls `updateTag("catalog")`, so the next request re-renders with fresh data and the result is cached again. The database is only hit after an edit or at build time.
- **Channel numbers** are per market: local channels 1…n, then world channels and regional neighbours from 101 (`src/lib/lineup.ts`, ported from the design).
- **Non-market countries** (e.g. a visitor geolocated to `us`) render the default market with `canonical` → `/rw` and `noindex`.
- **TV navigation.** `src/components/tv/SpatialNav.tsx` ports the design's spatial `move()` scoring. Everything focusable is a real `<a>`/`<button>` with `data-nav`, so Tab, screen readers and no-JS links still work. BACK keys (Escape, Backspace, Tizen `10009`, webOS `461`) return Home and restore the last focused card; the player handles ↑/↓, PageUp/PageDown, ChannelUp/Down (Tizen `427/428`).
- **Old TV browsers.** `browserslist` targets Chrome 87 (≈2021+ LG/Samsung), and the CSS avoids `aspect-ratio`, `:has()` and nesting. The root size scales with the viewport in pure CSS (≈16px at 1920 CSS px, the usual TV viewport), with a `rem` term so browser zoom still works.
- **Playlist proxy.** The player uses hls.js with playlists fetched through `/hls/{slug}/…` (`src/app/hls/[slug]/[file]/route.ts`): the server fetches each `.m3u8` uncompressed and rewrites it so nested playlists stay on the proxy and video segments point straight at the broadcaster (no video passes through the app). This avoids broadcaster gzip that some clients fail to decode (`ERR_CONTENT_DECODING_FAILED`) and missing CORS on playlists. It only fetches a published channel's stream URL plus nested playlist URLs it signed itself while rewriting that channel's playlists (HMAC with `HLS_SIGNING_SECRET`, falling back to `SESSION_SECRET`), so it follows playlists across a broadcaster's CDNs but can't be used as an open proxy. If hls.js can't run or a segment is blocked (e.g. no CORS on segments), the player falls back to native HLS with the broadcaster's URL.
- **TV API.** `/api/v1/lineup/{cc}` is `buildLineup()` serialised by `toApiLineup()` (`src/lib/api.ts`): every channel once, rows and hero as ids, and logos already pointed at the image optimizer (`/_next/image?…&w=256`) when the host is allowlisted. A country that isn't a market gets the default market with `exact: false` (no redirect). It's versioned (`version: 1`): installed TV apps update slowly, so only make backwards-compatible changes. `/api/v1/*` sends `Access-Control-Allow-Origin: *` (`next.config.ts`) because the packaged webOS app runs from `file://`.
- **Partial Prefetching is off** on purpose (see the comment in `next.config.ts`): with it on, channels added after a deploy were first served from the generic App Shell with generic metadata.

## Admin (`/sandberg`)

- Sign-in is checked twice: `proxy.ts` is only a first gate; every admin page and server action calls `requireAdmin()` (`src/lib/auth/dal.ts`), which verifies the JWT and that the admin still exists.
- Session: HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie scoped to `/sandberg`, valid 8 hours.
- Login is rate-limited to 10 failed attempts per 15 minutes per IP or email (`login_attempts` table), and unknown emails cost the same argon2 work as wrong passwords, so emails can't be probed.
- Stream URLs and logo URLs must be `https://` (mixed content would be blocked on the HTTPS site).

## Deploying (VPS + GitHub Actions)

Everything runs on one VPS: nginx → Next.js (`node server.js`, port 3000) → MariaDB on `127.0.0.1` (not exposed).

- **CI** (`../.github/workflows/ci.yml`): lint, typecheck and tests on every PR and branch push (plus the TV app's tests and build).
- **Deploy** (`../.github/workflows/deploy.yml`): on push to `main`, runs CI, then SSHes into the VPS and runs `deploy/deploy.sh <sha>` (at the repo root). Run it manually from the Actions tab with **rollback** to switch back to the previous release.
- **`deploy/deploy.sh`**: fetches the commit, runs `pnpm install`, `pnpm db:migrate` and `pnpm build` in `rebatv-web/` **on the VPS** (the build prerenders from the private database), builds the TV app in `rebatv-webos/` into the release's `public/tv/`, assembles a standalone release in `/srv/rebatv/releases/<timestamp>-<sha>`, points `/srv/rebatv/current` at it, restarts the `rebatv` systemd service and health-checks it. If the new release doesn't answer, it switches back automatically. It keeps the live release plus the 2 before it. Also `deploy.sh --rollback [id]` and `deploy.sh --list`. A rollback doesn't undo migrations, so keep them backwards compatible.

One-time VPS setup:

1. Node 22 and pnpm (`corepack enable`); a `rebatv` user that owns `/srv/rebatv`.
2. MariaDB with `bind-address = 127.0.0.1`, a `rebatv` database (utf8mb4) and a user with privileges on it only.
3. `git clone <repo> /srv/rebatv/repo`; put the production env in `/srv/rebatv/shared/.env` (`DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, optionally `HLS_SIGNING_SECRET`, `DEFAULT_MARKET`), readable only by `rebatv`.
4. Install `deploy/rebatv.service` (repo root) into `/etc/systemd/system/` and enable it. Let the deploy user restart it without a password:
   `rebatv ALL=(root) NOPASSWD: /usr/bin/systemctl restart rebatv` (via `visudo -f /etc/sudoers.d/rebatv`).
5. First deploy by hand: `/srv/rebatv/repo/deploy/deploy.sh origin/main`, then `pnpm admin:create` from `/srv/rebatv/repo/rebatv-web` (with the env loaded).
   Upgrading a VPS from before the `rebatv-web/` split: nothing to change; `repo/node_modules` and `repo/.next` from the old layout can be deleted.
6. GitHub → Settings → Environments → `production`, add the secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a dedicated ed25519 key whose public half is in that user's `authorized_keys`), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <host>`) and optionally `DEPLOY_PORT`.

`next build` uses roughly 1 GB of RAM; on a VPS with 2 GB or less, add swap.
