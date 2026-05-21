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

## Troubleshooting a regressed deploy

A Cloudflare Pages auto-build briefly re-promoted a 6-day-old `dist/`
on 2026-05-21, shipping the deleted v0 `LocalStorageAdapter` to
production. Admin edits silently went to each visitor's browser
localStorage instead of D1. If you suspect a similar regression:

**1. Compare the live bundle hash to your latest local build.**

```bash
# What's live right now:
curl -s https://flen-varldsorkester.pages.dev/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'

# What your local build produces:
npm run build
ls dist/assets/index-*.js
```

The two hashes don't have to match deploy-to-deploy (Vite hashes based
on content), but if your local build produces a different hash from a
deploy whose source commit equals your `HEAD`, something is off.

**2. Confirm the live bundle isn't the v0 LocalStorageAdapter.**

```bash
curl -s https://flen-varldsorkester.pages.dev/$(curl -s https://flen-varldsorkester.pages.dev/ \
  | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1) | grep -c "localStorage"
# Expected: 0. Anything > 0 means the v0 bundle is back.
```

The `npm run build` postbuild script (`scripts/check-bundle.mjs`)
performs the same check locally and will exit non-zero if the v0
patterns ever sneak back into your local `dist/`.

**3. Bypass the GitHub auto-build with a manual deploy.**

If the auto-deploy is the regression source, push the correct bundle
directly. Wrangler auth on the dev machine is enough — the GitHub
integration is bypassed:

```bash
npm run build                                  # passes postbuild check
npx wrangler pages deploy dist --branch main   # uploads dist as the new production deployment
```

The deploy URL printed at the end (e.g. `https://abcd1234.flen-varldsorkester.pages.dev`)
should serve the same bundle hash as the canonical
`https://flen-varldsorkester.pages.dev`.
