# CMS Setup Guide

This site uses a Cloudflare-native CMS:

- **D1** stores all content (sections, child pages, news, events, media).
- **Pages Functions** (under `functions/`) serve `/api/*` endpoints.
- **Admin login** uses a PBKDF2-hashed password and a signed HttpOnly session cookie.
- **No file uploads yet** — images and videos are referenced by URL or path.

---

## 0. Cloudflare account check (DO THIS FIRST)

⚠️ **This site lives in Lutte's separate Cloudflare account.** Before creating D1,
applying migrations, or setting secrets, confirm Wrangler is authenticated into
the correct account — otherwise the site and database may end up in different
accounts and the deploy will silently fail.

```bash
npx wrangler whoami
```

If the output shows an account that is **not** Lutte's, switch:

```bash
npx wrangler logout
npx wrangler login
```

Then log in with Lutte's Cloudflare account in the browser window that opens.

Run `npx wrangler whoami` again to confirm.

Only proceed to step 1 once the active account is Lutte's.

---

## 1. First-time setup

### 1.1 Create the D1 database
```bash
# Confirm correct account first
npx wrangler whoami
# Should show Lutte's account.

npx wrangler d1 create lutte-berg-cms
```
Copy the returned `database_id` into `wrangler.jsonc` (replace `REPLACE_WITH_REAL_DB_ID`).

### 1.2 Run the schema migration (production)
```bash
# Re-confirm correct account before running migrations on remote D1
npx wrangler whoami

npx wrangler d1 execute lutte-berg-cms --remote --file=migrations/0001_initial_schema.sql
```

### 1.3 Run the seed migration (production)
```bash
npx wrangler d1 execute lutte-berg-cms --remote --file=migrations/0002_seed.sql
```
The seed uses `INSERT OR IGNORE` everywhere, so re-running it is safe.

### 1.4 Generate an admin password hash
```bash
node scripts/hash-password.mjs
```
You'll be prompted for a password (hidden input). The script prints:
```
ADMIN_PASSWORD_HASH=...
ADMIN_PASSWORD_SALT=...
ADMIN_PASSWORD_ITERATIONS=100000
```

> **Iteration count matters.** The script uses 100 000 iterations to stay inside
> Cloudflare Workers' per-request CPU budget. Higher values (e.g. 600 000) cause
> every login attempt to fail with a 500 because the request runs out of CPU
> time before PBKDF2 finishes. Don't bump this without testing.

### 1.5 Generate a session secret
```bash
node scripts/random-secret.mjs
```
Prints:
```
SESSION_SECRET=...
```

### 1.6 Set the four secrets on Cloudflare
Run each command and paste the value when prompted:
```bash
npx wrangler whoami

npx wrangler pages secret put ADMIN_PASSWORD_HASH
npx wrangler pages secret put ADMIN_PASSWORD_SALT
npx wrangler pages secret put ADMIN_PASSWORD_ITERATIONS
npx wrangler pages secret put SESSION_SECRET
```
Repeat for both `production` and (if you want admin to work there) `preview`
environments via the Cloudflare Pages dashboard.

### 1.7 Deploy
Push to GitHub. Cloudflare Pages builds and publishes automatically.
Cloudflare Pages "Root Directory" should be **empty or `/`** (this repo's root IS
the Vite project root — there is no `app/` subdirectory inside the repo).

## GitHub repo connection check

Before relying on auto-deploy from GitHub, verify in the Cloudflare Pages dashboard:

1. Go to **Cloudflare dashboard → Pages → lutte-berg-orchester → Settings → Builds & deployments → Source**.
2. The connected GitHub repository must belong to or be accessible by **Lutte's GitHub account** (or a GitHub organization Lutte is a member of with deploy access).
3. If the repo is connected via someone else's GitHub account, future deploys will break when that person's token expires or access is revoked. Reconnect the integration via Lutte's GitHub account in that case.
4. After any reconnect, push a small commit to trigger a fresh build and verify it deploys.

---

## 2. Day-to-day editing

### 2.1 Log in
Visit `https://your-site/admin/login`. Type the password from step 1.4.
On success you'll land on `/admin`.

### 2.2 Add a YouTube video
1. `/admin` → **Sektioner** (or **Undersidor**) → **Redigera** the relevant section.
2. Scroll to **Tilldelad media**.
3. **Lägg till ny** → select **YouTube** → paste any of these URL forms:
   - `https://www.youtube.com/watch?v=ID`
   - `https://youtu.be/ID`
   - `https://www.youtube.com/embed/ID`
4. (Optional) Set a title, mark "Fäst överst" to make it the leader (and hero, when section's hero type is "Bakgrundsvideo").
5. **Lägg till**. The video appears immediately in admin and on the public site.

If you paste anything that isn't a YouTube URL you get a friendly Swedish error:
> "Ogiltig YouTube-länk. Klistra in en länk som börjar med youtube.com/watch?v=, youtu.be/ eller youtube.com/embed/."

Iframe / HTML markup pasting is **rejected** server-side.

### 2.3 Add a news post / event
- **Nyheter / Evenemang** → **+ Skapa**.
- Status defaults to **Utkast** (draft). Drafts are visible in admin but **never on the public site**.
- Switch to **Publicerad** and save to publish.

### 2.4 Add or edit a child page (e.g. a new sub-project under FVO)
- **Undersidor** → **+ Skapa undersida**.
- Pick parent section, set a slug (URL fragment), title, body, optional hero image.
- Once saved, scroll back to add media to it (same flow as 2.2).

### 2.5 Log out
- Bottom of left sidebar → **Logga ut**. Clears the session cookie.

---

## 3. Local development

### 3.1 Fast SPA dev (default — recommended for content/UI tweaks)
```bash
npm run dev
```
Reads from `src/data/seedContent.json` via `SeedAdapter`. **Read-only** — saves
are disabled. Pages Functions are not running.

### 3.2 Full-stack dev (against local D1)
```bash
# one-time: create a local D1 + run migrations against it
npx wrangler d1 create lutte-berg-cms-local
npx wrangler d1 execute lutte-berg-cms-local --local --file=migrations/0001_initial_schema.sql
npx wrangler d1 execute lutte-berg-cms-local --local --file=migrations/0002_seed.sql

# put local-only secrets in .dev.vars (gitignored)
node scripts/hash-password.mjs
node scripts/random-secret.mjs
# copy the 4 lines into .dev.vars

# each run:
npm run build
VITE_USE_API=true npx wrangler pages dev dist --d1 DB=lutte-berg-cms-local
```

---

## 4. Changing the admin password
Repeat steps 1.4 and 1.6 — `wrangler pages secret put ADMIN_PASSWORD_HASH` (and SALT/ITERATIONS if they differ). Existing sessions stay valid for up to 7 days
unless you also rotate `SESSION_SECRET` (which invalidates every session immediately).

---

## 5. Rotating the session secret
```bash
node scripts/random-secret.mjs
npx wrangler pages secret put SESSION_SECRET
```
Logs everyone out immediately. Use this if you suspect a session cookie leak.

---

## 6. Known limitations
- **No file upload yet** — Lutte must paste image URLs or use `/assets/...` paths to assets already committed under `public/assets/`. Add image upload via R2 in a follow-up.
- **Single admin user** — one password protects everything.
- **No rate limiting** — acceptable for a small private admin surface; revisit if abuse appears.
- **Sessions last 7 days** — see step 5 to rotate.
- **Migrations are forward-only** — to roll back the schema, restore from a D1 snapshot or write a reverse migration.

---

## 7. Rollback / troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Public site shows error banner | `/api/content` is 500 | Check D1 binding in Cloudflare Pages → Functions; run `wrangler d1 list` |
| `/admin/login` returns 500 | One of the four secrets is unset | Run `wrangler pages secret list` and set whatever's missing |
| Login always fails with "Fel lösenord" | Hash mismatch with the local `hash-password.mjs` output | Regenerate hash and re-set the secret; ensure iterations match |
| `Set-Cookie` not sticking | Browser blocks `Secure` cookie on `http://localhost` | Use `wrangler pages dev` which serves over `http://localhost` — modern browsers accept Secure cookies on localhost as an exception. If still broken, deploy to a preview URL. |
| Migration fails with `UNIQUE constraint failed` | You're re-running `0002_seed.sql` after manual edits | Expected — `INSERT OR IGNORE` skips conflicts. Not an error. |
| Wrangler keeps switching to the wrong Cloudflare account | The active account is stored in `~/.wrangler/config/default.toml`. Run `npx wrangler logout`, then `npx wrangler login` and choose Lutte's account in the browser. For machines that switch between accounts often, lock the active session with `export CLOUDFLARE_ACCOUNT_ID=<lutte-account-id>` (or `$env:CLOUDFLARE_ACCOUNT_ID=...` in PowerShell) before running wrangler commands. |
| Login returns 500 "Server configuration error: ADMIN_PASSWORD_ITERATIONS=600000 exceeds…" | The hash was generated with the old 600k default. Re-run `node scripts/hash-password.mjs` (now defaults to 100 000) and re-set the three `ADMIN_PASSWORD_*` secrets with the new values. |
| Login returns 500 "Internal server error" with no detail | Check `npx wrangler pages deployment tail` while reproducing — the actual error name + message + stack is logged server-side (no secrets). Also hit `GET /api/health` to confirm the env vars are even visible to the Function. |

## Diagnostic endpoint

`GET /api/health` returns booleans (not values) for the four secrets and the
D1 binding. Use it to confirm the runtime config after every secret rotation:

```bash
curl -s https://flen-varldsorkester.pages.dev/api/health
# Expected:
# {"ok":true,"hasDB":true,"hasAdminPasswordHash":true,
#  "hasAdminPasswordSalt":true,"hasAdminPasswordIterations":true,
#  "hasSessionSecret":true}
```

If any of those booleans is `false`, that's the secret to re-set via
`npx wrangler pages secret put <NAME>`.

---

## Image uploads (R2, Phase 2 — May 2026)

Image uploads in the admin write to a Cloudflare R2 bucket and store a
`media_items` row that points at it. Videos still use YouTube links (no
file uploads for video).

### What changed in the schema

Migration `0003_media_alt_and_uploads.sql` adds four columns to
`media_items`. All are nullable:

| Column        | Purpose |
|---------------|---------|
| `alt`         | Accessibility alt text, distinct from `caption` |
| `object_key`  | R2 object key for self-hosted uploads (e.g. `uploads/2026/05/abc-foo.jpg`). NULL for YouTube items and for legacy `/assets/...` images |
| `content_type`| MIME of the uploaded object (`image/jpeg`, `image/png`, `image/webp`) |
| `size`        | Byte size of the uploaded object |

Apply once on the remote D1:

```bash
npx wrangler d1 migrations apply lutte-berg-cms --remote
```

### What the admin sees

- A new tab **Ladda upp bild** in the media-assignment block on any section
  or child-page edit screen.
- Native file picker, accepting JPG / PNG / WebP only (SVG is rejected).
- 10 MB size cap, enforced both client-side (instant feedback) and
  server-side (defense in depth).
- Preview of the chosen file before saving.
- Per-file metadata: title, caption, **alt text**, pinned, published/draft.
- Progress bar (uses XMLHttpRequest `upload.onprogress`).
- Friendly Swedish error messages: `Filen är för stor.`, `Endast JPG, PNG och WebP stöds.`, `Uppladdningen misslyckades. Försök igen.`

### What gets stored

- The R2 object lives at `uploads/YYYY/MM/<randhex>-<safe-stem>.<ext>`.
  Randomness in the prefix means filename collisions never overwrite a
  previously-uploaded image.
- The DB row has `type='image'`, `url='/media/<object_key>'`,
  plus `object_key`, `content_type`, `size`.

### Editing existing media (Phase 3 — May 2026)

Every media row in the admin now has a **Redigera** button. The edit form
covers `title`, `caption`, `alt`, `pinned`, and `status`. It does **not**
touch the underlying URL/file/YouTube id — so renaming a video no longer
requires deleting and re-uploading.

The PUT endpoint is the existing `/api/admin/media/:id`; the React side
calls `contentRepository.updateMedia(id, updates)` which is already wired
through `ApiAdapter`.

### Deleting an uploaded image

The DELETE handler now also calls `env.MEDIA_BUCKET.delete(object_key)` so
the R2 object is reclaimed at the same time as the DB row. If R2 fails the
DB row is still deleted (we'd rather leak the object than leave a row
pointing at nothing the admin can edit).

