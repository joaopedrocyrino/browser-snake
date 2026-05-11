import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// `base: './'` keeps asset paths relative so the build works whether it's
// served from the repo root, a /snake/ subpath (GitHub Pages), or any
// subdomain.
export default defineConfig({
  base: './',
  server: {
    port: 5180,
  },
  plugins: [
    VitePWA({
      // Auto-update strategy: when a new SW is found, it activates immediately
      // on the next page load. Right call for a single-page game with no
      // unsaved-state concerns.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Snake',
        short_name: 'Snake',
        description: 'Classic Snake — built by João Cyrino.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Precache every built asset; the SW serves them from cache offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: {
        // Off in dev — caching during iteration causes more pain than it solves.
        // Test offline behavior via `npm run build && npm run preview`.
        enabled: false,
      },
    }),
  ],
})
