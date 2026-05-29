# Statusöversikt (uppdaterad 2026-05-29)

Det här stycket är en levande sammanfattning ovanpå den ursprungliga uppgiftsbeskrivningen längre ner. Klar = ✅, Pågående = 🟡, Inte påbörjad = ⬜.

| Fas | Vad | Status | Kommentar |
|-----|-----|--------|-----------|
| 1 | Audit av media, R2, hero, prestanda | ✅ Klar | Rapport levererad. Inget mer audit-arbete behövs. |
| 2 | Bilduppladdning i admin (R2) | ✅ Klar | `MEDIA_BUCKET` binding, `/api/admin/upload`, `/media/<key>`-routen, `MediaManager.jsx`. Migration 0003 körd. Bucket finns. |
| 3 | Redigera media-titel/caption utan att radera | ✅ Klar | `PUT /api/admin/media/:id` + `EditMediaForm`. Bekräftat fungerar. |
| 4 | Hero-video + titel-layout | ✅ Klar (efter dagens uppdatering) | Delad `HeroVideoSection`. **Idag, iteration 2:** (a) Auto-unmute har nu BÅDA strategierna: postMessage + iframe-remount med `mute=0` på första muted-gesten. Aktiveringar enligt HTML-spec (click / pointerdown / touchstart / keydown). `scroll`/`wheel` lyssnas också men kommer inte att starta ljud — webbläsares autoplay-policy tillåter inte ljud från scroll, det är ingen kodbugg, "Slå på ljudet"-knappen är fallback. (b) Botten-griböndet borttaget; titeln är nu en egen "label" (`.hero-video-title`) med svart fyllning + orange ram + vit text. (c) Tidigare "afterband" är borta. |
| 4.2 | Nyheter + evenemang per sida (sektion ELLER undersida) | ✅ Klar (idag, iteration 2) | Migration `0004_news_events_child_page.sql` lägger till `child_page_id` på `news` + `events`. Admin-formulären visar nu en dropdown där man kan välja t.ex. *Flen Världsorkester / Musaik Projektet* för att lägga nyheten/evenemanget enbart på Musaik-sidan. Sektionssidor visar bara sektionsdirekta items (de Musaik-specifika bubblar inte upp till FVO). |
| 4.3 | Title-label, Jazz/Målarateljen/Textilverkstad | ✅ Klar (idag) | `Section.jsx` använder nu `HeroVideoSection` för ALLA sektioner. Jazz-sidan (utan video) får samma orange-omramade titel-label och short-description som body-lead under hero. |
| 4.4 | "Fäst överst" = en-per-sida-radio | ✅ Klar (idag) | Servern (`functions/api/admin/media.js` + `media/[id].js`) avpinnar automatiskt alla andra media-rader för samma föräldersida när admin pinnar något nytt. Effekt: max ett hero per sida. UI är kvar som checkbox men beteendet är radio-aktigt. |
| 4.5 | Filväljarens lokalisering | ✅ Klar (idag) | Den nativa filinput'en är visuellt gömd; den synliga knappen är på svenska ("Välj bild från datorn") och bredvid står "Ingen bild vald." / filnamnet. Webbläsares OS-lokalisering läcker inte längre genom. |
| 4.6 | Titel-label (iteration 3) | ✅ Klar (idag) | Orange ram borttagen. Titeln är nu en frosted-glass panel: halvtransparent svart fyllning, backdrop-blur, lätt rundade hörn (4-6px) och en smal orange topplinje (3-4px) som enda brand-accent. Subtilare, mindre dominant. |
| 4.7 | Favicon FVO | ✅ Klar (idag) | `public/favicon.png` (1254×1254, RGBA) installerad. `index.html` länkar nu både `.png` (primärt) och `.svg` (fallback för vektorprefererande webbläsare). Apple-touch-icon också satt. |
| 4.1 | Enhetligt galleri (Video/Foto-flikar) på child-pages | ✅ Klar (idag) | `ChildPage.jsx` använder nu `MediaTabs` + `MediaPreviewGrid` + `VideoModal`. Fixar bonusbuggen att videos uppladdade till t.ex. Musaik inte syntes någonstans. |
| 5 | Mobil / responsiv | ✅ Klar | `overflow-x: clip`, `clamp()`-titlar, fluid section-padding. Behöver bara verifieras på 390px efter omdeploy. |
| 6 | Prestanda | ✅ Klar | Bilder ~94% mindre (`scripts/optimize-images.mjs`), tumnaglar istället för iframes i galleri, lazy-loading. Hero-iframe är `eager` (rätt — den ligger ovan fold). |
| 7 | Deploy | 🟡 Pågående | Första deployen körd idag (`index-oVkcDzSG.js`). **Behöver göras om** för att fasen-4-ljudfixen + den nya gallery-fliken på child-pages ska gå live. |

## Det här behöver Jane göra nu vid tangentbordet (uppdaterad)

### Steg 1 — Applicera migration 0004 på remote D1

Den nya migrationen lägger till `child_page_id` på `news` + `events`. Måste köras *före* deploy, annars kommer Cloudflare Functions att 500:a på POST/PUT av nyheter/evenemang.

```
cd "E:\Lutte Berg\Orchester\app"
npx wrangler d1 migrations apply lutte-berg-cms --remote
# svara y på frågan om tillgänglighet
```

Verifiera:

```
npx wrangler d1 execute lutte-berg-cms --remote --command "PRAGMA table_info(news);"
```

Kolla att `child_page_id` finns i utdata (samma för `events`).

### Steg 2 — Granska och commit:a dagens ändringar

```
git status
git diff --stat
```

Det här ska ha ändrats sedan förra commit:
- `migrations/0004_news_events_child_page.sql` (nytt)
- `functions/api/_lib/content.js`
- `functions/api/admin/media.js`
- `functions/api/admin/media/[id].js`
- `functions/api/admin/news.js`
- `functions/api/admin/news/[id].js`
- `functions/api/admin/events.js`
- `functions/api/admin/events/[id].js`
- `src/lib/cms/contentRepository.js`
- `src/pages/Section.jsx`
- `src/pages/ChildPage.jsx`
- `src/pages/admin/News.jsx`
- `src/pages/admin/Events.jsx`
- `src/pages/admin/MediaManager.jsx`
- `src/components/HeroVideoSection.jsx`
- `src/components/HeroVideoSection.css`
- `Plan.md`

```
git add migrations/0004_news_events_child_page.sql `
        functions/api/_lib/content.js `
        functions/api/admin/media.js `
        "functions/api/admin/media/[id].js" `
        functions/api/admin/news.js `
        "functions/api/admin/news/[id].js" `
        functions/api/admin/events.js `
        "functions/api/admin/events/[id].js" `
        src/lib/cms/contentRepository.js `
        src/pages/Section.jsx `
        src/pages/ChildPage.jsx `
        src/pages/admin/News.jsx `
        src/pages/admin/Events.jsx `
        src/pages/admin/MediaManager.jsx `
        src/components/HeroVideoSection.jsx `
        src/components/HeroVideoSection.css `
        Plan.md

git commit -m "feat: news/events per child-page (migration 0004); single-pinned-per-page; hero for all sections; Swedish file picker; bulletproof hero unmute"
git push origin main
```

### Steg 3 — Deploy

```
npm run deploy:production
```

### Steg 4 — Rök-test

- `/flen-varldsorkester` öppnat direkt (jämfört med inkognitofönster): första klick någonstans → ljudet tänds. På efterföljande omladdningar samma sak.
- `/jazz-world-music-club` (eller dess slug) — titel-label med orange ram, "Din lokala scen för fantastisk jazz och världsmusik." står som body-lead under hero, inte som överlagring.
- `/admin` → Nyheter → Skapa Nyhet → välj target *Flen Världsorkester / Musaik Projektet* → spara. Öppna `/flen-varldsorkester/musaik-projektet` → ska visa nyheten. Öppna `/flen-varldsorkester` → ska INTE visa den.
- `/admin` → Sektioner → Flen Världsorkester → Tilldelad media → "Ladda upp bild" → filinput'en visar bara svenska, ingen "Выберите файл" mer.
- `/admin` → ändra Fäst-överst på en bild → spara → andra tidigare-fästa items i samma sektion ska automatiskt vara avpinnade.
- 390px: ingen sidled-scroll.

---

We need a focused production improvement pass for the Lutte Berg / Kulturföreningen Flen Världsorkester site.

Context:

* Site: Cloudflare Pages + React/Vite + Cloudflare Pages Functions + D1 CMS.
* Admin saves to D1 and currently works.
* Current official deployment workflow is:
  git switch main
  git pull origin main
  npm run deploy:production
* Do not rely only on GitHub auto-build.
* Do not reintroduce localStorage CMS behavior.
* Do not break existing admin save flow.
* Do not change ForFun or unrelated projects.

Main user requests from Lutte:

1. Admin should support image upload from local computer.
2. Admin should allow editing media title/caption without deleting and re-adding the file.
3. Hero video on `/flen-varldsorkester` should behave like Musaik hero and try to play sound as soon as browser allows after user interaction/scroll/click.
4. Hero title/subtitle layout should be cleaned up: video should be visible, title should not block the video, subtitle should move into text area.
5. Mobile layout has horizontal movement/overflow and title text does not fit well.
6. Site feels slow; investigate and improve the main obvious causes.

Please do this as a careful code task, not a redesign from scratch.

---

## PHASE 1 — AUDIT BEFORE CHANGING

First inspect and report the exact current implementation:

1. Media admin:

   * Which admin components manage media?
   * How `media_items` are saved in D1?
   * Which fields already exist: title, caption, alt, url, thumbnail, pinned, status, section_id, child_page_id?
   * Can existing D1 schema support editing title/caption without migration?

2. File upload:

   * Confirm that runtime uploads cannot be stored into `public/assets` or Git repo on Cloudflare Pages.
   * Recommend Cloudflare R2 for uploaded images.
   * Check whether project already has any R2 binding/config. If not, propose minimal setup.

3. Hero:

   * Compare `/flen-varldsorkester` and `/flen-varldsorkester/musaik-projektet`.
   * Explain why Musaik hero behaves better than FVO hero.
   * Identify exact components/CSS involved:

     * `Section.jsx`
     * `ChildPage.jsx`
     * `HeroVideoSection`
     * related CSS

4. Performance:

   * Check if YouTube iframes load too early.
   * Check if too many embeds/images load above the fold.
   * Check bundle size.
   * Check image sizes and whether large unoptimized images are used.
   * Check service worker/PWA caching behavior.
   * Report the top 3 concrete reasons the site feels slow.

Stop and report if any migration/binding is required before implementing.

---

## PHASE 2 — IMAGE UPLOAD IN ADMIN

Add real image upload for admin.

Important:
Do NOT implement video file uploads now unless explicitly approved later.
For videos, continue using YouTube links.

Image upload should work like this:

1. In admin Media section:

   * Button: “Ladda upp bild”
   * Clicking opens native file picker.
   * User chooses image from computer.
   * Show preview before saving.
   * User can set:

     * title
     * caption
     * alt text
     * section
     * optional child page
     * pinned
     * status: draft/published
   * Then user clicks Save.

2. Storage:

   * Use Cloudflare R2 for uploaded image files.
   * Add R2 binding, suggested name:
     MEDIA_BUCKET
   * Store file metadata in D1 `media_items`.
   * Store URL/path/key in D1.
   * Do not store binary image in D1.

3. Upload endpoint:

   * Add protected admin endpoint, for example:
     POST `/api/admin/upload`
   * Must require valid admin session.
   * Accept only image MIME types:
     image/jpeg
     image/png
     image/webp
   * Reject SVG for now unless sanitized.
   * Add file size limit, for example 8 MB or 10 MB.
   * Generate safe unique object key:
     uploads/YYYY/MM/<uuid-or-timestamp>-safe-file-name.webp/jpg/png
   * Return:
     {
     key,
     url,
     contentType,
     size
     }

4. Serving images:

   * Either serve through a safe route like `/media/<key>` backed by R2
   * Or use a configured R2 public/custom domain if already available.
   * Prefer the simplest working production path.
   * Add cache headers for public images.

5. Admin UX:

   * Show upload progress/loading state.
   * Show success message.
   * Show friendly Swedish errors:

     * “Filen är för stor.”
     * “Endast JPG, PNG och WebP stöds.”
     * “Uppladdningen misslyckades. Försök igen.”
   * Do not make Lutte type file paths manually for uploaded images.

6. Documentation:

   * Update CMS_SETUP.md / DEPLOYMENT.md / HOW_IT_WORKS.md with:

     * how to create R2 bucket
     * how to bind it to Pages Functions
     * binding name
     * upload limitations
     * how uploaded images are stored and served

---

## PHASE 3 — EDIT EXISTING MEDIA TITLE/CAPTION WITHOUT DELETE

Currently, if a photo/video title is wrong, Lutte has to delete the media and add it again.

Fix this.

Requirements:

1. In admin Media list, each media item should have Edit.
2. Edit should allow changing:

   * title
   * caption
   * alt text
   * pinned
   * status
   * section
   * child page
   * sort order if supported
3. Editing metadata must NOT require re-uploading the image or re-adding the YouTube link.
4. Save should call existing or new PUT endpoint:
   PUT `/api/admin/media/:id`
5. Public site should reflect changed title/caption after save.
6. Existing media URLs/files must remain unchanged.

Acceptance:

* Add image/video once.
* Edit only title.
* Save.
* Refresh public site.
* New title appears.
* Original file/video remains the same.

---

## PHASE 4 — HERO VIDEO + TITLE LAYOUT

Fix hero presentation on:

* `/flen-varldsorkester`
* `/flen-varldsorkester/musaik-projektet`

Current problems:

* FVO hero still has wrong spacing/layout compared to Musaik.
* There is too much or wrong space before/around video.
* Subtitle/text overlays block the video.
* On Musaik, the title/subtitle is too centered over the video and hides the video.

Expected design:

1. Video should start immediately below the header.

   * No empty white/cream space before hero video.
   * Keep breathing room after hero before body text.

2. H1/title should be visually clean.
   Preferred:

   * black or dark translucent ribbon/gradient at the bottom of the video
   * title placed there, not in the middle of the video
   * video remains visible

3. Subtitle / short description:

   * Move it below the video into the text/content area.
   * Make it bold or heading-like, as part of the body content.
   * Do NOT place long text over the video.
   * Apply this both to FVO and Musaik.

4. Video visibility:

   * The hero video should not be hidden by large central text.
   * Keep title overlay minimal.

5. Sound behavior:

   * Do not promise impossible browser behavior.
   * Autoplay on page load should remain muted because browsers block sound autoplay.
   * Improve auto-unmute logic:

     * if user scrolls/clicks/touches/presses key, try to unmute
     * do not remove listener too early if unmute fails
     * make FVO and Musaik use the same logic
   * If a user opens a video from a click/modal, start with sound where browser allows it because click is user interaction.
   * Add visible “Slå på ljudet” button if sound is blocked.

6. Investigate why:

   * Musaik plays with sound initially but not on second visit.
   * FVO does not behave the same.
   * Fix shared logic so behavior is consistent.

Important:
Uploading/self-hosting hero video may improve control/performance in some cases, but it does NOT guarantee autoplay with sound. Do not switch to self-hosted video unless there is a clear performance reason and a minimal safe implementation.

---

## PHASE 5 — MOBILE / RESPONSIVE FIXES

Fix mobile layout issues.

Problems:

* Text/title does not fit.
* Page moves horizontally left/right.
* Some blocks overflow viewport.

Requirements:

1. No horizontal scroll on:

   * homepage
   * `/flen-varldsorkester`
   * `/flen-varldsorkester/musaik-projektet`
   * gallery page
   * admin login and basic admin pages if simple to fix

2. Use responsive typography:

   * long titles like “Kulturföreningen Flen Världsorkester” must fit
   * use CSS `clamp()` if appropriate
   * ensure wrapping works naturally

3. Check 390px mobile width.

4. Remove unsafe negative margins unless absolutely controlled.

5. Ensure hero video, title ribbon, Musaik logo, media previews, and SocialCTA fit mobile.

Acceptance:

* No sideways page movement on mobile.
* Long H1 does not overflow.
* Hero title remains readable.
* Buttons do not overflow.

---

## PHASE 6 — PERFORMANCE CHECK

Investigate why the site feels slow.

Please do a targeted performance pass, not a huge rewrite.

Check:

1. Are YouTube iframes loading too early?
2. Are many videos embedded at once instead of thumbnails?
3. Are large images loaded uncompressed?
4. Is the hero video blocking initial render?
5. Is PWA service worker caching outdated assets?
6. Is admin/public content fetch slow?

Suggested improvements:

* Lazy-load non-hero videos.
* For video grids, use thumbnails and open iframe only in modal on click.
* Add loading="lazy" for below-the-fold images.
* Add width/height or aspect-ratio to avoid layout shift.
* Use optimized image sizes for uploaded images if feasible.
* Do not load all YouTube iframes on initial page if thumbnails are enough.
* Keep hero video eager only if above the fold.
* Keep `/api/*` excluded from service worker navigation fallback.

Report:

* what was slow
* what was changed
* what should be optimized later if not fixed now

---

## PHASE 7 — DEPLOYMENT

After implementation:

1. Run:
   npm run build
2. Run:
   npm run deploy:production

This should:

* build
* run bundle safety checks
* deploy manually with Wrangler
* verify live production bundle equals local dist

3. Report:

* changed files
* whether migration was needed
* whether R2 binding is needed
* new Cloudflare setup steps if any
* production bundle filename
* deploy verification result
* test checklist results

Important:
Do not consider the task complete just because Cloudflare says Success.
It is complete only when:

* `npm run deploy:production` exits 0
* production bundle matches local dist
* admin save still works
* uploaded image appears publicly
* edited media title appears publicly
* mobile no longer has horizontal overflow
