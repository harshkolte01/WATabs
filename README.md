# Multi WhatsApp

Open-source **desktop app** for running multiple WhatsApp Web accounts in one window. Messaging stays on the official WhatsApp Web site — this app is a local multi-profile container.

> Independent project. Not affiliated with, endorsed by, or connected to WhatsApp LLC or Meta Platforms, Inc.

## Layout

```text
apps/desktop/     Electron desktop app (Phase 1 shell foundation)
packages/         shared-types, validation, eslint-config, testing
tests/            unit, security, manual-whatsapp (Phase 0 proof)
scripts/          verify-no-injection, verify-fuses
```

## Quick start

```bash
pnpm install
pnpm start
```

Phase 1 starts a trusted local React shell only (no WhatsApp accounts yet). Multi-account sessions arrive in Phase 2.

## Checks

```bash
pnpm typecheck
pnpm test:unit
pnpm verify:no-injection
pnpm package
pnpm verify:fuses
```

## Status

Phase 1 — Secure Application Foundation (in progress / landing). See `implementation_plan.md`.
