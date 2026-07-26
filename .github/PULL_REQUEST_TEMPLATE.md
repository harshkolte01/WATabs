## Summary

<!-- What changed and why (1–3 bullets). -->

-

## Test plan

- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm verify:no-injection`
- [ ] Manual smoke if UI/behavior changed (relevant `tests/manual-whatsapp/PHASE*_MANUAL_SMOKE.md`)

## Security / privacy notes

- [ ] No WhatsApp preload, `executeJavaScript` into account views, or content scraping
- [ ] Logs/IPC remain free of message bodies, PINs, cookies, and session paths
- [ ] N/A — docs/chore only
