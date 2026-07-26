# Compatibility Proof Checklist

Use **dedicated WhatsApp test accounts only**. Do not use personal production accounts.

Hard stop: if WhatsApp shows an explicit unsupported-client block in stock Electron, **do not bypass**. Record `NO-GO` in [RESULTS.md](RESULTS.md).

## Environment

| Field | Value |
|-------|-------|
| Date | |
| Operator | |
| OS | Windows 10/11 / macOS |
| Electron version | (see app console: `[desktop] electron=…`) |
| Chromium version | (see `[desktop] chrome=…`) |
| Default UA | (see `[desktop] userAgentFallback=…`) |
| App path | `apps/desktop/` via `npm start` |

## Technical proof

- [ ] Default Electron browser identity loads `https://web.whatsapp.com/`
- [ ] No user-agent spoofing (no `userAgent` / `setUserAgent` / session UA overrides in code; logged UA is stock Electron)
- [ ] WhatsApp does **not** present an explicit unsupported-client block
- [ ] Account A QR login works
- [ ] Account B QR login works
- [ ] Partitions are isolated (`persist:wa-a0000000-…0001` vs `…0002`; sessions do not share chats/cookies)
- [ ] Both sessions survive full quit + relaunch
- [ ] Standard manual messaging works in Account A
- [ ] Standard manual messaging works in Account B
- [ ] File upload works (image or document) in at least one account; ideally both
- [ ] File download works (received file saves under OS Downloads; see `[downloads:…]` logs)
- [ ] Notifications work from Account A session
- [ ] Notifications work from Account B session
- [ ] Notification click behavior understood on **Windows** (document in RESULTS)
- [ ] Notification click behavior understood on **macOS** (document in RESULTS)
- [ ] Microphone permission works where the website requests it (allow path for `https://web.whatsapp.com` only)
- [ ] No preload or injection on WhatsApp views (code review: no WA preload, no `executeJavaScript` against WA)
- [ ] Legal and branding review accepts the intended distribution model ([LEGAL_BRANDING_BRIEF.md](LEGAL_BRANDING_BRIEF.md))

## Isolation checks

- [ ] While logged into both, Account A chat list does not show Account B’s identity
- [ ] Logging out of Account A does not log out Account B
- [ ] After restart, both accounts remain linked without scanning QR again

## Notification click notes (required)

Record for each OS:

1. App focused → click notification → what happens?
2. App minimized → click notification → what happens?
3. Other account active → notification from background account → click → correct account selected?
4. If exact account routing fails without injection: confirm safest fallback (bring app forward; preserve Chromium focus if it switched; never parse notification text)

## Code boundary review

- [ ] WhatsApp `WebContentsView` has no `preload`
- [ ] No `executeJavaScript` targeting WhatsApp views
- [ ] No UA override APIs used
- [ ] Shell preload exists only for the local toolbar (`shell-preload.ts`)
- [ ] WhatsApp never loads in the default session or shell partition

## Verdict

Record final `GO` / `NO-GO` at the top of [RESULTS.md](RESULTS.md).
