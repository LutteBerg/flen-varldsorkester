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

## Production deploy workflow (MANDATORY)

**GitHub auto-build is NOT trusted for this project.** It has silently regressed production to a stale bundle at least twice. Always use the manual deploy.

Production is **only considered correct** when `deploy:verify` confirms the live bundle filename equals the local `dist/` bundle built from the current `main` HEAD. That means production must be deployed from updated `main` after a PR is merged — not from a feature branch.

### Mode B — Official production deploy (after PR merge) — THE workflow

ALWAYS done from updated `main`. Never from a feature branch.

```powershell
# 1. PR merged on GitHub
# 2. From your local machine:
cd "E:\Lutte Berg\Orchester\app"
git switch main
git pull origin main
npm install                   # in case deps changed
npm run deploy:production     # build + check + deploy + verify
```

This single command will:
1. Build the project
2. Run `postbuild` safety check (forbidden patterns: localStorage, etc.)
3. Manually deploy via `wrangler pages deploy`
4. Verify the live production bundle filename matches the local `dist/` bundle

The production bundle hash that comes from this run is the canonical state. Record it from the `deploy:verify` output (e.g. `index-XXXXXXXX.js`).

### If `npm run deploy:production` exits with mismatched bundle:

Cloudflare's auto-build overwrote your manual deploy with a stale bundle. Re-run:
```powershell
npm run deploy:production
```
That will republish the correct bundle. Keep re-running until verification passes.

### Do NOT judge deploy success by:
- ❌ GitHub PR "All checks passed" — doesn't verify the deployed bundle
- ❌ Cloudflare Pages "Success" status — doesn't catch the regression we saw
- ❌ A working `/api/health` — that just confirms Functions are alive, not which bundle is served
- ❌ A green `deploy:verify` from a feature branch — that bundle is temporary, not the canonical main release

### Always judge by:
- ✅ `npm run deploy:verify` exit code 0, run from updated `main` after PR merge
- ✅ Manual visual check after hard reload

> **Mode A — Testing during development (feature branch) — smoke test only**
>
> You can run `npm run deploy:production` from a feature branch while developing to verify the deploy machinery works end-to-end (build, check, upload, verify). This is **not a release** — it just confirms the pipeline. The bundle that lands in production from a feature-branch run is temporary; the next Mode B deploy from `main` will replace it.
>
> **If you deployed from a feature branch for testing, you MUST re-run `npm run deploy:production` from updated `main` after the PR is merged — otherwise `main` and production drift apart.**

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

## Local secrets

Production secrets live in Cloudflare Pages environment variables, set via
`wrangler pages secret put <NAME>` or the dashboard. They MUST NOT be committed.

`.env` is gitignored. Copy `.env.example` to `.env` for local development.
Personal credentials (email passwords, GitHub passwords) DO NOT belong in `.env`
under any circumstances — use a password manager.

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

---

## Phase 2 (May 2026) — R2 upload pipeline

Admin image uploads (Lutte's new "Ladda upp bild" button) write to a private
R2 bucket. The site serves uploaded files via the in-app `/media/<key>`
route, so no custom domain is required.

### One-time bucket setup

Run once from the project root after pulling `main`:

```bash
npx wrangler whoami                                        # confirm right account
npx wrangler r2 bucket create lutte-berg-media             # create the bucket
```

Bucket name must exactly match `r2_buckets[0].bucket_name` in `wrangler.jsonc`.
The binding name (`MEDIA_BUCKET`) is what the Pages Functions code reads from
`env.MEDIA_BUCKET`.

### Bind it in the Pages dashboard

`wrangler.jsonc` is only fully authoritative for `wrangler pages deploy`. For
production runs to actually pick up the binding, also add it in the Cloudflare
dashboard:

1. Cloudflare → Workers & Pages → **lutte-berg-orchester** → Settings → Functions.
2. **R2 bucket bindings** → **Add binding**.
3. Variable name: `MEDIA_BUCKET`. R2 bucket: `lutte-berg-media`. Save.
4. Redeploy via `npm run deploy:production` for the binding to attach.

### Apply migration 0003

The migration adds `alt`, `object_key`, `content_type`, `size` columns to
`media_items`. It is idempotent on D1's current SQLite (ADD COLUMN is a no-op
if the column already exists).

```bash
npx wrangler d1 migrations apply lutte-berg-cms --remote
```

### What gets uploaded vs. what is served

- Upload endpoint: `POST /api/admin/upload` (multipart/form-data). Admin-gated
  via the existing session-cookie middleware. Accepts `image/jpeg`,
  `image/png`, `image/webp`; max 10 MB; rejects SVG.
- Storage: R2 key format is `uploads/YYYY/MM/<8-hex>-<safe-stem>.<ext>`.
- DB row: the upload endpoint inserts a `media_items` row with
  `type='image'`, `url='/media/<key>'`, plus the new `object_key`,
  `content_type`, `size` columns.
- Serving: `GET /media/<key>` (`functions/media/[[path]].js`) streams from R2
  with `Cache-Control: public, max-age=31536000, immutable`.

### Useful checks

```bash
npx wrangler r2 object list lutte-berg-media --prefix uploads/
npx wrangler d1 execute lutte-berg-cms --remote --command \
  "SELECT id, url, object_key, content_type, size, status FROM media_items WHERE object_key IS NOT NULL ORDER BY created_at DESC LIMIT 5;"
```

---

## Phase 6 (May 2026) — Image optimization

`public/assets/**` previously held 107 MB of full-camera JPGs. The first
production deploy shipped them as-is, making every page slow to first paint.

The optimizer script is `scripts/optimize-images.mjs`. It uses ImageMagick
`convert` to resize each image to a max 1600 px dimension and re-encode JPEGs
at quality 80, replacing the file in place. Originals are backed up to
`./image-originals/` (outside `public/`, so Vite won't re-include them in
`dist/`). The first run reduced `public/assets/` from **106.65 MB → 12.48 MB**
(94 MB saved, ~88%).

```bash
# Dry-run first to see what would happen
node scripts/optimize-images.mjs --dry-run

# Real run
node scripts/optimize-images.mjs

# Custom size (e.g. 1280 px) or quality
node scripts/optimize-images.mjs --max=1280 --quality=85
```

Requirements:
- ImageMagick on PATH (`magick`/`convert`). On Windows: install from
  https://imagemagick.org/script/download.php#windows.

Re-running is safe — files smaller than 250 KB are skipped and existing backups are not overwritten.

