# Phase 3 Manual Smoke

```bash
pnpm start
```

1. Add an account — WhatsApp Web stays on `https://web.whatsapp.com` (QR or chats).
2. Click an external https link inside WhatsApp — opens in the system browser; stays denied in-app.
3. Confirm dangerous links never open the app shell (`file:`, `javascript:`) — no effect / blocked in logs.
4. Set **Mic** to **Ask**, trigger a call/voice feature if available — sidebar prompt appears; Deny/timeout leaves mic blocked.
5. Set **Notifications** to **Off** — notification permission should not succeed for that account.
6. Packaged build (optional): DevTools shortcuts do not open on the account view.

Record pass/fail here or in `RESULTS.md`.
