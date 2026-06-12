import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'favicon.svg',
        'assets/fvo_logo.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],
      workbox: {
        // SPA navigation fallback must NEVER intercept /api/*. Pages Functions
        // serve API routes; if the SW returned cached index.html for an
        // /api/admin/* fetch we'd get HTML where JSON is expected and every
        // admin save would mysteriously "succeed" (200 OK) but the response
        // wouldn't parse, masking real errors.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Kulturföreningen FlenVärldsOrkester',
        short_name: 'FlenVärldsOrkester',
        description: 'Musik, konst och kreativa mötesplatser i Amazon, Flen.',
        lang: 'sv-SE',
        start_url: '/',
        scope: '/',
        theme_color: '#E66A2C',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
