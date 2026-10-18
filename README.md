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

## CI
GitHub Actions runs game logic tests, TypeScript checks and the Vite production build, then uploads `case-rush-web.zip`.

## Current limitations
This is a prototype, not a published Telegram bot. It has no server-side Telegram initData verification, cloud saves, player trading, PvP, or real-money purchases. LocalStorage progress is tied to the current browser/device.
