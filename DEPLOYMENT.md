# Deployment Guide

This project is configured as a Vite-based Single Page Application (SPA) with Progressive Web App (PWA) support. 

## Cloudflare Pages Setup

To deploy this project to Cloudflare Pages via GitHub/GitLab:

1. **Root directory**: `app` (Since the Vite project is inside the `app` folder, you MUST set the Root Directory to `app` in Cloudflare Pages settings)
2. **Framework preset**: Vite (or None)
3. **Build command**: `npm run build`
4. **Build output directory**: `dist`
5. **Environment variables**: None required for the frontend.

## Routing (SPA)

Since this is a client-side routed application, Cloudflare Pages needs to redirect all non-file requests to `index.html`. 
This is automatically handled by the `public/_redirects` file which contains:
```
/* /index.html 200
```
This ensures direct links like `https://yoursite.com/flen-varldsorkester` work without returning a 404 error.

## Mock CMS (localStorage)

The current version uses `localStorage` as a mock CMS to store text, media URLs, and settings.
- Changes made in the `/admin` panel are saved in your current browser.
- If you need to refresh the content to the initial state (from `seedContent.json`), you can use the "Återställ från seedContent" button in the admin dashboard.
- **Future Note**: For true production persistence, replace the `localStorageAdapter` with a backend service like Cloudflare D1 or a headless CMS.
