import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Where the site is going to live.
 *
 * A GitHub Pages *project* page is served from `https://<owner>.github.io/<repo>/`,
 * not from the root of a domain, so every URL has to carry that prefix. The
 * deploy workflow sets `BASE_PATH`; anywhere the site sits at the root of a
 * domain — a custom domain, Netlify, Vercel, Cloudflare Pages, `npm run preview`
 * — leaves it unset and gets `/`.
 */
function resolveBase(): string {
  const wanted = process.env.BASE_PATH ?? '/'
  const leading = wanted.startsWith('/') ? wanted : `/${wanted}`
  return leading.endsWith('/') ? leading : `${leading}/`
}

const base = resolveBase()

// https://vite.dev/config/
export default defineConfig({
  base,

  plugins: [
    react(),

    /**
     * Everything the shelf needs — the bundle, the fonts, the card art and the
     * WebGL code — is already served from this origin, so the service worker
     * only has to keep a copy of it. Nothing here fetches from the network at
     * runtime, which is what makes the shelf genuinely playable offline.
     */
    VitePWA({
      /**
       * A new build waits instead of taking over mid-game. `PwaControls` offers
       * the reload; until someone takes it, the open page is left alone.
       */
      registerType: 'prompt',

      // Registration lives in `src/pwa/PwaControls.tsx`, so the update prompt
      // can sit in the same corner as the install button.
      injectRegister: null,

      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],

      manifest: {
        // All three have to agree with `base`, or an installed copy opens on a
        // URL the service worker does not control.
        id: base,
        name: 'us · a shelf of games',
        short_name: 'us',
        description:
          'A shelf of little games. Pick one off the shelf and it comes to you.',
        start_url: base,
        scope: base,
        /**
         * Installed, the shelf should own the whole screen: no address bar, no
         * title bar, no status bar. `display_override` is what browsers that
         * understand it read first, and `display` is what everything else
         * falls back to — including Safari, which does not know `fullscreen`
         * and would otherwise drop all the way back to a normal browser window.
         */
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        lang: 'en',
        categories: ['games', 'entertainment'],
        // Both match the page background, so an installed window opens on the
        // same dark violet the shelf fades up out of.
        background_color: '#0b0715',
        theme_color: '#0b0715',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            // Launcher icons get cropped to whatever shape a platform likes,
            // so this one keeps its art inside the safe circle.
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Fonts and card art are imported by the app, so they land in the
        // hashed build output and get picked up here.
        globPatterns: [
          '**/*.{js,css,html,svg,png,webp,avif,ico,json,webmanifest,woff,woff2,ttf,otf,wasm}',
        ],
        // three.js and react-three-fiber make one big chunk, comfortably over
        // workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // A shared link like `/#heartcatcher` opens the game whether or not
        // there is a network behind it.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },

      /**
       * Also serve the manifest and service worker from `vite dev`, so the app
       * can be installed straight off the dev server. The update prompt stays
       * quiet in dev, where the worker is rebuilt on every request.
       */
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
    }),
  ],
})
