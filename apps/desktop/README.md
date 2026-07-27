# `@multi-whatsapp/desktop`

Electron desktop app (Phase 1 secure shell foundation).

## Develop

From repo root:

```bash
pnpm install
pnpm --filter @multi-whatsapp/desktop start
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm start` | Electron Forge + Vite dev |
| `pnpm package` | Package app (enables fuse verification) |
| `pnpm make` | Build installers (Windows NSIS wizard; macOS/linux ZIP) |
| `pnpm test:unit` | Vitest unit/security tests |
| `pnpm typecheck` | TypeScript check |

## Security notes

- Production shell loads via `watabs://shell/` (dev uses Vite HMR URL).
- Only `src/preload/shell-preload.ts` exposes `window.desktop` named methods.
- WhatsApp views are not part of Phase 1 default start.
