# AuraCast — Progress Handoff

Updated: 2026-09-23

## Status
In-progress. System cleanup finished; ~70% of the app built. Resume by executing
the steps under "NEXT UP" below.

## App spec (locked)
- Spotify listening data → daily Instagram-Story "Aura Gradient" (9:16, export 1080×1920 PNG).
- Frontend: Vite + React 19, Tailwind CSS 3, Framer Motion, html-to-image, lucide-react.
- Backend: Express 5 + Spotify OAuth 2.0 (top tracks, recently played, `/audio-features`).
- Aesthetic: dark minimalist gallery (#0A0A0A), Instrument Serif + Inter.

## Completed
1. ✅ System cleanup: `free -h` now ~2.0G swap free, journal 299M→50M, apt orphans removed, pip/npm caches purged, `/tmp` old files cleared.
2. ✅ Vite scaffold in `/home/bheemanbeats/aurabooster` (react template, ESM, Node 24).
3. ✅ Dependencies installed:
   - runtime: react, react-dom, axios, framer-motion, html-to-image, lucide-react, tailwindcss@3.4.17, express@5, cors, dotenv
   - dev: vite, @vitejs/plugin-react, oxlint, @types/react, autoprefixer, concurrently
4. ✅ `server/index.js` — Express API:
   - `GET /auth/login` → Spotify authorize (state cookie)
   - `GET /auth/callback` → code→token exchange, httpOnly cookie (base64url JSON w/ refresh_token)
   - `GET /api/profile` → user + topTracks(20) + recentlyPlayed(20) + nowPlaying + audioFeatures (batched), auto-refresh on 401
   - `GET /api/logout`, `GET /health`
   - manual cookie read (no cookie-parser dep)
5. ✅ `src/lib/auraEngine.js` — data→visual mapping:
   - hex utils, `mixHex`, mood detection (`kinetic` >0.7 energy warm; `midnight` <0.4 valence + high acousticness deep cool + high grain; `pastel` >0.7 valence)
   - deterministic seeded `generateVibeTitle` (formats like "3 AM Synthetic Nostalgia", "Melancholy & Espresso", "High-Energy Flow")
   - `composeProfile(payload)` flattens API/mock → `{avg, track, hour, user}`
   - `generate({avg,track,hour,user})` → `{blobs, grain, speed, accent, title, subline, trackLine, date, time, stats}`
6. ✅ `src/components/AuraCanvas.jsx` — animated fluid aura:
   - low-res canvas (@dpr capped, `quality` prop `preview`|`high`), CSS blur(26px)+saturate, screen-blend radial blobs, SVG feTurbulence grain overlay, radial vignette
   - `paused` prop freezes on last frame; ResizeObserver resize

## Next up (continue tomorrow)
- [ ] `src/data/mockData.js` — 3 mock listening profiles (must match `composeProfile` input schema).
- [ ] `src/components/StoryCard.jsx` — 540×960 exportable layout: AuraCanvas bg + noise + Instrument Serif vibe title + date/time + track line + "auracast.app" watermark. Expose forwardRef or controlled id so App can capture it.
- [ ] `src/App.jsx` — left control panel (mood presets toggle, Connect Spotify button, live/online status) + right 9:16 preview; export via html-to-image `toPng(node, {pixelRatio:2})` → 1080×1920 PNG download + clipboard/share; set `quality='high'` + `paused=true` a frame before capture.
- [ ] `src/lib/spotify.js` — tiny frontend fetch wrapper for `/api/profile`, `/api/logout`.
- [ ] Config: `tailwind.config.js` (content globs, `font-display` Instrument Serif, `font-sans` Inter, `ink` #0A0A0A), `postcss.config.js` (tailwindcss + autoprefixer), `vite.config.js` (proxy `/api`+`/auth` → :4242).
- [ ] `index.html` — Google Fonts (Instrument Serif + Inter), meta, title.
- [ ] `src/index.css` — `@tailwind` directives + custom scrollbar/selection. Delete `App.css` usage.
- [ ] `package.json` scripts: `dev:server` (node --watch), `dev:client` (vite), `dev` (concurrently).
- [ ] `.env.example` + `.env` → `SPOTIFY_CLIENT_ID/SECRET`, `SPOTIFY_REDIRECT_URI`, `FRONTEND_URL`, `PORT`.
- [ ] Verify: `npm run build` (oxlint + vite build) and `npm run dev`; test mock export shares 1080×1920.

## Key gotchas for tomorrow
- html-to-image: capture node with `pixelRatio:2`, `backgroundColor:'#0A0A0A'`, `cacheBust:true`. Fonts must be loaded before capture.
- Export flow order: set `quality='high'`, `paused=true`, `await` 2× `requestAnimationFrame`, then `toPng`.
- Express 5 route syntax — no string wildcards; endpoints above already correct.
- Node 24 has global `fetch` — no node-fetch needed in server.
- Vite proxy below is not yet written; remember it, otherwise `/api/*` 404s in dev.