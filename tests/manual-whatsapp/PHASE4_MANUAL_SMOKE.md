# Phase 4 Manual Smoke

```bash
pnpm start
```

1. Log in two accounts; leave both loaded.
2. Close the window — choose **Keep running** (tray). Confirm accounts are not destroyed (re-open from tray).
3. With the window hidden, receive a WhatsApp notification (real accounts). Click it — app shows; originating account is selected when Chromium focus maps it.
4. Settings → **Global notifications** Off — toasts should stop for all accounts.
5. Per-account **Notifications** Off — that account alone stops.
6. **Audio mute** On — UI warns it mutes calls/media; verify webContents audio is muted.
7. **Send test notification** — labeled “Multi Account Desktop test”, not a WhatsApp message.
8. Optional: enable **Start at login**.

## Operator / release gate (signed builds)

| Check | Dev `pnpm start` | Signed installer |
|-------|------------------|------------------|
| Toasts deliver | May work | Required for release |
| Windows AUMID `com.multiwhatsapp.desktop` | Set in code | Verify after install |
| macOS code-signed delivery | N/A here | Required |

Do not treat unsigned/dev notification delivery as production proof.
