# rebaTV

Free live TV from East Africa and the world, for big screens.

| Folder | What |
| --- | --- |
| [`rebatv-web/`](rebatv-web) | The website, admin (`/sandberg`), JSON API (`/api/v1`) and HLS playlist proxy (`/hls`). Next.js 16 + MariaDB. |
| [`rebatv-webos/`](rebatv-webos) | The TV app: a packaged `.ipk` for LG webOS 4+, and the same build hosted at `/tv/` for Hisense VIDAA. Preact + Vite. |
| [`deploy/`](deploy) | VPS deploy script, systemd unit and nginx site. One deploy ships the web app plus the hosted TV build. |
| [`.github/workflows/`](.github/workflows) | CI for both projects; deploy on push to `main`. |

The two projects are independent (each has its own `package.json` and lockfile, and there's no shared workspace). The TV app reads everything through the web app's API, so channels, numbering and featured picks are managed in one place, the admin.

```bash
cd rebatv-web && pnpm install && pnpm dev      # see rebatv-web/README.md for database setup
cd rebatv-webos && pnpm install && pnpm dev    # http://localhost:5173, uses the web app on :3000
```
