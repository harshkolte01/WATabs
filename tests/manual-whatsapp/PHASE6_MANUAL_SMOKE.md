# Phase 6 Manual Smoke

```bash
pnpm start
```

## App lock

1. Settings → Privacy & lock → set PIN → **Enable app lock**
2. **Lock now** / tray **Lock** — account views hidden; unlock with PIN
3. Wrong PIN → delay increases; no session wipe
4. Auto-lock (15 min) — leave idle; app locks
5. OS lock (Windows Win+L) — app locks when “Lock with OS” is On
6. Quit and relaunch with “PIN after restart” On — starts locked
7. **Reset app lock** — lock disabled; WhatsApp sessions remain

## Recovery

1. Force-crash one account renderer (Task Manager → kill renderer) — only that account recovers
2. Crash the same account 3+ times quickly — shows needs manual recovery; use **Retry recovery**
3. Sleep/wake — failed accounts retry; selection preserved when unlocked
4. Unexpected kill (End Task) + relaunch — sessions restore; diagnostics may show unexpected restart

## Diagnostics

1. Refresh system status — versions, loaded count, lock flags only
2. Preview support bundle — review allowlist + excludes
3. Save ZIP — local only; open and confirm no Partitions/cookies/PIN

Record pass/fail in `RESULTS.md` if desired.
