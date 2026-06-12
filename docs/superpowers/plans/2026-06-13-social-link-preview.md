# Social Link Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the distorted logo link card with the approved 1200 x 630 photograph and complete Facebook-compatible Open Graph image metadata.

**Architecture:** Keep the organization logo and the default social image as separate constants. Route resolution will use the social photograph only when a page has no content-specific image, while JSON-LD continues to expose the real logo. Head rendering will emit image URL, secure URL, type, dimensions when known, and factual alt text.

**Tech Stack:** Cloudflare Pages Functions, HTMLRewriter, Node test runner, Pillow for deterministic image generation, Vite.

---

### Task 1: Define the expected social metadata

**Files:**
- Modify: `test/seo-routes.test.js`
- Modify: `test/seo-render.test.js`

- [ ] **Step 1: Write failing route tests**

Assert that `/about` resolves to `/assets/social/fvo-social-preview.jpg` while the Organization JSON-LD logo remains `/assets/fvo_logo.png`.

- [ ] **Step 2: Write failing head tests**

Assert that the default social image emits:

```html
<meta property="og:image:secure_url" content="https://flen-varldsorkester.pages.dev/assets/social/fvo-social-preview.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="FlenVärldsOrkester med solist och kör på scen">
<meta name="twitter:image:alt" content="FlenVärldsOrkester med solist och kör på scen">
```

- [ ] **Step 3: Run the focused tests**

Run:

```powershell
node --test test/seo-routes.test.js test/seo-render.test.js
```

Expected: FAIL because the new social image constants and metadata do not exist.

### Task 2: Generate the approved social photograph

**Files:**
- Create: `public/assets/social/fvo-social-preview.jpg`

- [ ] **Step 1: Generate a deterministic center crop**

Use Pillow to resize `public/assets/fvo/alma-orkester.JPG` to cover 1200 x 630, then center-crop and save as optimized progressive JPEG.

- [ ] **Step 2: Validate the output**

Run a Pillow inspection and assert:

```text
format=JPEG width=1200 height=630
```

### Task 3: Separate logo and social image concerns

**Files:**
- Modify: `functions/seo/constants.js`
- Modify: `functions/seo/routes.js`
- Modify: `functions/seo/render.js`

- [ ] **Step 1: Add explicit constants**

Define:

```js
export const ORGANIZATION_LOGO_PATH = '/assets/fvo_logo.png';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/assets/social/fvo-social-preview.jpg';
export const DEFAULT_SOCIAL_IMAGE = {
  path: DEFAULT_SOCIAL_IMAGE_PATH,
  type: 'image/jpeg',
  width: 1200,
  height: 630,
  alt: 'FlenVärldsOrkester med solist och kör på scen',
};
```

- [ ] **Step 2: Resolve default routes to the social image**

Use `DEFAULT_SOCIAL_IMAGE_PATH` for page image fallbacks. Attach width, height, type, and alt only when the resolved image is the default social image.

- [ ] **Step 3: Preserve the real organization logo**

Use `ORGANIZATION_LOGO_PATH` for `Organization.logo` and `PerformingGroup.image`.

- [ ] **Step 4: Render complete social metadata**

Emit `og:image:secure_url`, `og:image:type`, known dimensions, `og:image:alt`, and `twitter:image:alt`.

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
node --test test/seo-routes.test.js test/seo-render.test.js
```

Expected: PASS.

### Task 4: Verify and publish

**Files:**
- No additional production files

- [ ] **Step 1: Run the full checks**

```powershell
npm run test:seo
npm run build
```

Expected: 36 or more tests pass and Vite build exits 0.

- [ ] **Step 2: Verify visual invariance**

Capture the home page at 1440 x 1000 and compare it against the existing production screenshot. Expected: zero changed pixels because only `<head>` metadata and a static unrendered asset changed.

- [ ] **Step 3: Commit**

Commit only the social preview implementation, generated image, tests, spec, and this plan.

- [ ] **Step 4: Deploy production**

Deploy `dist` to the Cloudflare Pages `main` branch and verify the production bundle.

- [ ] **Step 5: Verify crawler HTML**

Fetch the canonical domain with `facebookexternalhit`, `Googlebot`, and `GPTBot`. Expected: absolute social image URL plus type, 1200 x 630 dimensions, and alt metadata.

- [ ] **Step 6: Refresh Facebook**

Open Facebook Sharing Debugger for `https://flenvarldsorkester.se/` and request a new scrape so the cached logo card is replaced.
