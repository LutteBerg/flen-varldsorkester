# Social Link Preview Design

## Goal

Replace the distorted logo-based link preview with a photographic social card
that renders consistently in Facebook, WhatsApp, Telegram, and similar clients.
The visible website must remain unchanged.

## Image

- Source: `public/assets/fvo/alma-orkester.JPG`
- Output: `public/assets/social/fvo-social-preview.jpg`
- Exact dimensions: 1200 x 630 pixels
- Crop: centered cover crop from the approved source photograph
- No added text, logo, watermark, or keyword content
- JPEG output optimized for social crawler download

## Metadata

The server-rendered HTML will provide:

- `og:image` with an absolute HTTPS URL
- `og:image:secure_url`
- `og:image:type` set to `image/jpeg`
- `og:image:width` set to `1200`
- `og:image:height` set to `630`
- `og:image:alt` with a factual Swedish description
- Matching `twitter:image` and `twitter:image:alt`

The new image is the default for home, About, Contact, and routes without a
content-specific image. Existing project, event, and news images remain
route-specific.

## Verification

- Test-first assertions for the new default image and metadata
- SEO suite and production build pass
- Generated image is exactly 1200 x 630 and decodes as JPEG
- Existing page screenshots remain pixel-identical because only head metadata
  and a new static asset change
- Production HTML is checked as Facebook crawler, Googlebot, and GPTBot
- Facebook Sharing Debugger is asked to scrape the canonical domain again
