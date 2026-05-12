# Snake

> **Live:** [snake.cyrino.dev](https://snake.cyrino.dev)

A modern take on the classic. TypeScript + HTML5 Canvas + Vite, served as an installable PWA. Bilingual (English / Português-BR), themed (dark / light), with a grid that resizes to fill whatever screen it's on — from a 360 px phone to a 4K desktop window.

## Features

- **Wrap-around walls.** Cross an edge, appear on the opposite side. Only self-collision ends the run.
- **Dynamic grid.** Cell size is fixed (20 px); the grid fills your viewport. Phone portrait gets ~18 × 40 cells, a wide desktop gets 80 × 40+. Bigger screen → more strategic space, longer snake potential.
- **Two languages.** English + Português-BR. Auto-detects from `navigator.language`, persists your choice, follows `?lang=` URL params (so cyrino.dev can pass through its parent locale when this game is iframe-embedded).
- **Two themes.** Dark (default, CRT-green-on-black vibe) and light. Auto-detects `prefers-color-scheme`, follows OS changes live until you click a toggle.
- **Touch + keyboard.** Swipe gestures on phones, arrows/WASD on desktop. Adaptive hints on the start screen — auto-detected via `matchMedia('(pointer: coarse)')`.
- **Per-grid-size high scores.** Your phone's high score and your desktop's high score are tracked separately (they're effectively different games — wildly different board sizes).
- **PWA, installable, works offline.** Service worker precaches every asset on first visit. Browser offers "Install" / "Add to Home Screen." On install, launches in its own window without browser chrome — feels native.
- **Tiny.** ~3 KB gzipped JS. ~12 MB Docker image. Loads in under a second on a cold cache.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Move | Arrows / WASD | Swipe in direction |
| Start / Restart / Resume | Space | Tap |
| Pause | P or Esc | Tap |
| Switch language | Click `EN` / `PT` button (bottom-right) | Tap `EN` / `PT` button |
| Switch theme | Click ☀ / ☾ button (bottom-right) | Tap ☀ / ☾ button |

## URL parameters

When iframe-embedded, the parent can pass preferences through:

```
https://snake.cyrino.dev?lang=pt&theme=light
```

Precedence: URL param → `localStorage` → OS / browser default.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | catches off-by-one bugs that always bite grid games |
| Build | Vite | sub-second HMR, tiny output, sensible defaults |
| Rendering | Canvas 2D | one DOM node, imperative draws, ~60 fps for free |
| Framework | none | a `requestAnimationFrame` game loop and a React render loop are different jobs |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | service worker + manifest + auto-update without writing them by hand |
| Production server | nginx:alpine | smallest, fastest, defaults handle static perfectly |
| Reverse proxy / TLS | [caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy) (on droplet) | label-driven routing, auto-HTTPS via Let's Encrypt |

No backend. Score persistence is `localStorage`. There is nothing to break server-side because there is no server-side.

## Project structure

```
.
├── src/
│   ├── main.ts             single-file game loop, input, render, state
│   ├── types.ts            shared types (Direction, Point, State, ...)
│   ├── aurelio.ts          i18n strings (en/pt-BR) — named after the Brazilian dictionary
│   ├── portinari.ts        theme palettes (dark/light) — named after Cândido Portinari
│   ├── lang.ts             language detection + apply + persist
│   ├── theme.ts            theme detection + apply + persist
│   └── fisherYates.ts      uniform shuffle (used to pick a random empty apple cell)
├── public/
│   └── favicon.svg
├── index.html              entry point + inline theme CSS + control buttons
├── nginx.conf              PWA-aware cache headers (long for hashed assets, no-cache for sw.js/index.html)
├── Dockerfile              multi-stage: node:20-alpine → nginx:alpine
├── docker-compose.yml      production compose — joins the `proxy` Docker network on the droplet
├── vite.config.ts          base: './', PWA plugin config
└── .github/workflows/deploy.yml   build image → push to GHCR → deploy to droplet → health-check
```

Naming aside: `aurelio` (Brazilian Portuguese dictionary, [Aurélio Buarque de Holanda](https://en.wikipedia.org/wiki/Aur%C3%A9lio_Buarque_de_Holanda_Ferreira)) → it holds the language strings. `portinari` ([Cândido Portinari](https://en.wikipedia.org/wiki/Candido_Portinari), Brazilian painter) → it holds the color palettes. Helps tell apart "what to say" from "how to look."

## Run locally

```bash
git clone https://github.com/joaopedrocyrino/browser-snake.git
cd browser-snake
npm install
npm run dev          # http://localhost:5180
```

## Build

```bash
npm run build        # outputs to dist/
npm run preview      # serves dist/ at http://localhost:4173 — for offline / PWA testing
```

`vite.config.ts` uses `base: './'` so the build works from any path: a domain root, a `/snake/` subpath on GitHub Pages, or behind a reverse proxy at any subdomain.

## Deploy

Automated end-to-end. Every push to `main`:

1. GitHub Actions builds a Docker image (~12 MB final) and pushes it to GitHub Container Registry tagged with both `:latest` and `:sha-XXXXXXXX`.
2. SCPs `docker-compose.yml` to the droplet.
3. Writes `/opt/snake/.env` pinning `SNAKE_IMAGE` to the just-built SHA — every deploy is traceable, every previous SHA is a rollback target.
4. `docker compose pull && up -d` on the droplet.
5. Health check via `curl -H "Host: snake.cyrino.dev" http://localhost/`. If it fails within 30s, rolls back to the previous image.

The container joins a shared `proxy` Docker network where [caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy) lives. Caddy reads Snake's container labels (`caddy: snake.cyrino.dev`, `caddy.reverse_proxy: "{{upstreams 80}}"`), generates a Caddyfile snippet, and provisions a Let's Encrypt cert on first request — zero edits to the shared infrastructure.

## Iframe-safe by design

The page is intended to be embeddable in other sites:

- `html, body { margin: 0; background: transparent; overflow: hidden }`
- No own page chrome — only the canvas and the toggle buttons.
- Canvas centers itself with `display: grid; place-items: center` — behaves identically at any window size.
- All keyboard handling at `window` level.
- `touch-action: none` on the body so swipe gestures aren't intercepted as scroll/pull-to-refresh.

## Architecture notes

Single-file game logic (`src/main.ts`, ~400 lines) on purpose. Every refactor temptation here — splitting render, input, state, loop into modules — is premature until a second game proves out the shared shape. The [Snake/Sudoku/Pong scenario](https://github.com/joaopedrocyrino) for why is in my private notes; the short version is "the abstractions you'd build today don't survive contact with the second game."

What did get extracted: language strings (`aurelio`), color palettes (`portinari`), shuffle algorithm (`fisherYates`), and the detect/apply/persist trio for both language and theme. Those are *data*, not *flow* — they don't fight the single-file principle.

The render loop uses three perf tricks:

1. **Dirty-flag rendering.** `draw()` only paints when state has changed. Drops actual paints from 60/sec to ~7/sec during play, to **zero** on the start/pause/gameover screens. Significant battery savings on phones.
2. **Offscreen grid cache.** The faint CRT grid is drawn once into a hidden canvas on resize/theme change, then blitted with a single `drawImage` per frame instead of re-drawing ~70 line segments.
3. **RAF parks when idle.** `requestAnimationFrame` only runs while playing. On start/paused/gameover, the loop draws once and stops — restart is triggered by `invalidate()` on any user action.

Combined, the game runs at well under 1% CPU on any modern device.

## License

MIT — fork it, mod it, ship it.
