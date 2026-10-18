# CASE RUSH — AUTO EMPIRE

A Telegram Mini App prototype for collecting stylized cars, opening cases, upgrading a garage and entering automatic races.

## Current prototype
- Mobile-first interface designed to open inside Telegram Web Apps.
- Russian and Ukrainian interface toggle.
- Three original SVG car illustrations plus a case illustration.
- Local-only save data for the single-player prototype.
- Case odds displayed in the UI and validated in game logic.
- Automatic race simulation, garage upgrades and duplicate compensation.

## Run locally
- Node.js 22+
- `npm install`
- `npm run dev`

## CI and HTTPS deployment
GitHub Actions runs game logic tests, TypeScript checks and the Vite production build, then uploads `case-rush-web.zip`. A separate Pages workflow builds with the repository subpath and deploys the static app through GitHub Pages.

Expected GitHub Pages URL (only after a successful deployment): `https://filesgloom-png.github.io/Case-Rush---Auto-Empire/`. This is a target URL, not a claim that the site is already live. GitHub Pages must be enabled for this repository with Settings → Pages → Build and deployment → Source set to GitHub Actions. That repository setting is outside the available read/write GitHub API actions in this session.

## Telegram launch preparation
- The client calls the Telegram WebApp SDK's `ready()` and `expand()`, applies app colors, and tracks viewport/safe-area changes where the SDK exposes them.
- The client only detects whether launch `initData` is present. It does not treat `initDataUnsafe` as authentication and does not claim the player is verified.
- If a backend is added, send the raw `Telegram.WebApp.initData` over HTTPS to that backend and validate its signature using Telegram's documented HMAC procedure and bot token on the server only. Never put the bot token in frontend code or logs. Reject invalid/expired data and enforce authorization server-side.
- Host the built `dist` contents on an HTTPS origin before configuring the URL in BotFather. A CI ZIP artifact is a build output, not a live hosted website.

## Current limitations
This is a prototype, not a published Telegram bot. Live HTTPS deployment and BotFather configuration must be verified after the Pages workflow succeeds. There is no server-side Telegram initData verification, backend, cloud saves, player trading, PvP, or real-money purchases. LocalStorage progress is tied to the current browser/device and can be modified by the user; it must not be used as an authoritative economy source.
