# Phase 5 Manual Smoke

```bash
pnpm start
```

## Uploads (WhatsApp Web native)

1. Image, video, PDF, document upload
2. Drag-and-drop into chat (must not navigate the account view away)
3. Clipboard image paste
4. Cancel file picker

## Downloads

1. Download image / PDF / document — appears under **Downloads** with progress
2. Duplicate filename — saved as `name (1).ext`
3. Cancel an in-progress download
4. Pause / resume when the item supports it
5. Show in folder after complete
6. Open an `.exe` (or rename a test file) — executable warning when enabled
7. Clear history — list clears; files remain on disk
8. Settings → Ask where to save — dialog appears on next download

## Media permissions

1. Mic Ask → prompt “wants to use your microphone”
2. Always allow / Block persist in **Permissions**
3. Camera allow/block
4. Screen share Ask still prompts each time
5. Non-WhatsApp origin must never receive permissions (automated tests cover this)

Record pass/fail here or in `RESULTS.md`.
