# Phase 2 Manual Smoke (QR)

Use dedicated WhatsApp test accounts only.

## Steps

```bash
pnpm start
```

1. Click **Add your first account**, label it `A`, scan QR.
2. Add second account `B`, scan QR with a different phone/account.
3. Switch A ↔ B without reload flicker wiping the other session.
4. Quit and relaunch — both remain linked (`loadOnStartup`).
5. Disable B — view unloads; A still works. Re-enable B.
6. Reload A — only A reloads.
7. Clear session on B — B shows QR again; A untouched.
8. Remove B — A remains logged in and selectable.
9. Confirm WhatsApp views never expose `window.desktop` (DevTools on account view: `window.desktop` is undefined).

Record pass/fail in this file or `RESULTS.md`.
