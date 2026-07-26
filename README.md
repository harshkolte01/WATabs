# WATabs (multi-whatsapp)

Open-source **desktop app** for running multiple WhatsApp Web accounts in one window. Messaging stays on the official WhatsApp Web site — this app is a local multi-profile container.

> Independent project. Not affiliated with, endorsed by, or connected to WhatsApp LLC or Meta Platforms, Inc.

## Layout

```text
apps/desktop/     Electron desktop app (WATabs)
packages/         shared-types, validation, eslint-config, testing
tests/            unit, security, manual-whatsapp
scripts/          verify-no-injection, verify-fuses
site/             Static public site (Vercel) — Phase 7 roadmap & downloads CTA
docs/             Phase 7 secrets inventory (names only)
```

## Quick start

```bash
pnpm install
pnpm start
```

## Checks

```bash
pnpm typecheck
pnpm test:unit
pnpm verify:no-injection
pnpm package
pnpm verify:fuses
```

## Public site (Vercel)

Static HTML in [`site/`](site/). Deploy with Vercel **Root Directory** = `site`, framework **Other**.

- Landing, Phase 7 roadmap, updates/channels, privacy stub
- Download buttons point at GitHub Releases (configured in `site/app.js`)
- Step status: edit `site/phase7-status.json`

## Updates (Phase 7)

**Until Phase 7 is built:** `pnpm start` / local `pnpm package` have **no** auto-update. Users install new builds manually from GitHub Releases.

Auto-update for users depends on Phase 7 implementing the updater, signing keys, and a published signed feed (GitHub Releases + `electron-updater`). See `implementation_plan.md` Phase 7 steps 0–7 and [`site/phase7.html`](site/phase7.html).

## Status

Phases 0–6 land in the desktop app; Phase 7 packaging/updates is planned (roadmap site ready). See `implementation_plan.md`.
