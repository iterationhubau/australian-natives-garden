import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Set VITE_BASE=/australian-natives-garden/ for GitHub Pages project sites. */
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Australian Natives Garden',
        short_name: 'AU Natives',
        description: 'Australian natives library, germination, purchases, and garden planning',
        theme_color: '#064e3b',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    {
      name: 'spa-github-pages-fallback',
      closeBundle() {
        const index = resolve(__dirname, 'dist/index.html')
        const fallback = resolve(__dirname, 'dist/404.html')
        if (existsSync(index)) copyFileSync(index, fallback)
      },
    },
  ],
})
