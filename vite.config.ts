import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Multi-page: the legal pages are static documents, so they ship as their
    // own HTML entries rather than behind a client router. Real URLs, no
    // routing JS, and each page is independently cacheable and crawlable.
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        cookies: resolve(import.meta.dirname, 'cookies.html'),
      },
    },
    target: 'es2022',
    // Thumbnails are 3–13 KB; inlining them costs more in base64 than a
    // parallel HTTP/2 fetch, so keep everything above 2 KB as a real file.
    assetsInlineLimit: 2048,
  },
})
