import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // SPA navigation fallback must NEVER intercept /api/*. Pages Functions
        // serve API routes; if the SW returned cached index.html for an
        // /api/admin/* fetch we'd get HTML where JSON is expected and every
        // admin save would mysteriously "succeed" (200 OK) but the response
        // wouldn't parse, masking real errors.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Kulturföreningen Flen Världsorkester',
        short_name: 'Flen Världsorkester',
        description: 'Musik, konst och kreativa mötesplatser i Amazon, Flen.',
        theme_color: '#E66A2C',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
