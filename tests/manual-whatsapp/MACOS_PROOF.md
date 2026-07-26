# macOS Compatibility Proof Runbook

Run on a Mac before closing the Phase 0 gate. Windows-only environments cannot complete this file.

## Caveats (§12.6 / §12.7)

- Unsigned / `npm start` builds may fail to deliver notification events correctly on macOS.
- Do not treat development-mode notification behavior as production proof.
- Production proof later requires a code-signed build; for this proof, document unsigned observations and the signed-build gap.

## Steps

```bash
cd apps/desktop
npm install
npm run smoke    # automated load / no-block check
npm start        # interactive proof
```

1. Confirm console shows stock Electron UA (contains `Electron/`).
2. QR login Account A and Account B with dedicated test accounts.
3. Trigger notifications from both sessions while:
   - App focused
   - App minimized
   - Other account active (background session notifies)
4. Click each notification; record whether the correct account becomes active.
5. If exact routing is impossible without injection, confirm safest fallback (§12.5):
   - App comes forward
   - Chromium focus preserved if it switched accounts
   - Never parse notification text
6. Open a WhatsApp Web mic/voice-note prompt; confirm permission allow path for `https://web.whatsapp.com`.

## Record results

Copy observations into [RESULTS.md](RESULTS.md) under **Notification click observations → macOS** and mark the macOS checklist columns.
