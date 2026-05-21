# CMS Setup Guide

This site uses a Cloudflare-native CMS:

- **D1** stores all content (sections, child pages, news, events, media).
- **Pages Functions** (under `functions/`) serve `/api/*` endpoints.
- **Admin login** uses a PBKDF2-hashed password and a signed HttpOnly session cookie.
- **No file uploads yet** — images and videos are referenced by URL or path.

---

## 1. First-time setup

### 1.1 Create the D1 database
```bash
npx wrangler d1 create lutte-berg-cms
```
Copy the returned `database_id` into `wrangler.jsonc` (replace `REPLACE_WITH_REAL_DB_ID`).

### 1.2 Run the schema migration (production)
```bash
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
ADMIN_PASSWORD_ITERATIONS=600000
```

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
