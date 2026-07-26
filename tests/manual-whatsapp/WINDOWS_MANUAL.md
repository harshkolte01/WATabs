# Windows Compatibility Proof Manual Matrix

Automated smoke (`npm run smoke`) already covers: stock Electron load of both partitions, no unsupported-client title signal, default UA logging, notification permission allow for WhatsApp origin, on-disk partition isolation.

Complete the items below with **dedicated test accounts** and `npm start`.

## Commands

```bash
cd apps/desktop
npm start
```

Console must show:

- `[desktop] electron=…`
- `[desktop] userAgentFallback=…Electron/…` (no custom spoof)
- `[desktop] partitions=persist:wa-…0001, persist:wa-…0002`

## Manual steps

1. Confirm both Account A and Account B show the WhatsApp Web QR / link screen (no unsupported-client block).
2. Scan QR for Account A, then switch to Account B and scan with a second phone/account.
3. Isolation: verify each account shows its own chats only; logging out one must not log out the other.
4. Quit the app fully (tray/process gone) and relaunch — both sessions remain linked.
5. Send/receive a message in each account.
6. Upload an image or document; download a received file (check OS Downloads + `[downloads:…]` logs).
7. Notifications: with OS notifications enabled, message each account while:
   - App focused
   - App minimized
   - The other account is active
8. Click notifications; record account-routing behavior in [RESULTS.md](RESULTS.md).
9. Trigger a microphone / voice-note permission prompt inside WhatsApp Web; confirm allow works.

## Caveat (§12.7)

Unsigned `npm start` notification behavior is not production proof. Re-verify after a signed installer + App User Model ID in later phases.
