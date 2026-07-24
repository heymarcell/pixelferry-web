# pixelferry-web

Public marketing / landing site for **PixelFerry** — a fast, native-feeling macOS
batch image converter.

This repo is **public** and holds only the landing page. The product (the Electron
desktop app + Cloudflare backend) lives in the separate **private** monorepo
`pixelferry-app`. The split follows the hybrid topology in that repo's
`docs/devops-plan.md` (§B1): GitHub repos are atomically public or private, so the
public landing page can't share a repo with the private app.

## Status

Scaffold. The Pencil-designed landing page will be built here. `index.html` is a
placeholder.

## Develop

Static for now — open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

A build toolchain (Vite/Astro) will be added when the real landing page lands.

---

© 2026 heymarcell. All rights reserved. PixelFerry is a proprietary product; this
repository contains only its public marketing site.
