# Deployment Guide

> ⚠️ **Cloudflare account warning**
>
> Make sure Wrangler is authenticated into Lutte's Cloudflare account before
> creating D1, applying migrations, or setting secrets. Otherwise the site
> and database may end up in different Cloudflare accounts. Always run
> `npx wrangler whoami` first.

This project is a Vite + React SPA (with PWA support) deployed to Cloudflare Pages.
Backend persistence is via Cloudflare D1 + Pages Functions — see `CMS_SETUP.md`
for the full backend setup.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| **Root Directory** | `/` (empty or `/`) — the `package.json` is at repo root, not in an `app/` subdirectory |
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Compatibility date | `2026-05-01` (see `wrangler.jsonc`) |

> **If your existing Pages project is configured with `Root Directory: app`**,
> change it to empty / `/` in **Pages → Settings → Builds & deployments**.
> Otherwise the build will fail to find `package.json`.

## Routing (SPA + API)

- `public/_redirects` contains `/* /index.html 200` so deep links like
  `https://yoursite.com/flen-varldsorkester` resolve to the SPA.
- Pages Functions under `functions/` match BEFORE `_redirects`, so `/api/*`
  always hits the Functions handlers — the SPA fallback never swallows them.

## Bindings + secrets

- D1 database: bind as `DB` (see `wrangler.jsonc`) — `wrangler d1 create lutte-berg-cms`, then paste the `database_id`.
- Secrets (all four required):
  - `ADMIN_PASSWORD_HASH`
  - `ADMIN_PASSWORD_SALT`
  - `ADMIN_PASSWORD_ITERATIONS`
  - `SESSION_SECRET`

See `CMS_SETUP.md` step 1 for the full setup commands.
