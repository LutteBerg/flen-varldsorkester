# Deployment Guide

This project is a Vite + React SPA (with PWA support) deployed to Cloudflare Pages.
Backend persistence is via Cloudflare D1 + Pages Functions — see `CMS_SETUP.md`
for the full backend setup.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| **Root Directory** | *(empty / `/`)* — this repo's root IS the Vite project root |
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Compatibility date | `2026-05-01` (see `wrangler.jsonc`) |

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
