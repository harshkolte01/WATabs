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

Desktop updater (`electron-updater`) is wired for **packaged** builds only. `pnpm start` reports updates as unavailable.

- Channels: Settings → Updates (`stable` / `beta`)
- Feed: GitHub Releases (`harshkolte01/WATabls`)
- Release CI: [`.github/workflows/release.yml`](.github/workflows/release.yml) on `v*` tags
- Secrets: [`docs/phase7-secrets.md`](docs/phase7-secrets.md)
- Smoke: [`docs/PHASE7_MANUAL_SMOKE.md`](docs/PHASE7_MANUAL_SMOKE.md)

`autoUpdateLive` on the public site stays `false` until Step 7 acceptance (signed feed + partition smoke) passes.

## Status

Phases 0–6 complete in-app; Phase 7 updater/CI landed — signing certs + live feed acceptance still required. See `implementation_plan.md`.
