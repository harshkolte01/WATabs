# Compatibility Proof Results

## Verdict

**CONDITIONAL TECHNICAL GO (Windows smoke)** — Stock Electron 43.2.0 loads `https://web.whatsapp.com/` in two isolated persistent partitions with no unsupported-client block and no UA spoofing/injection.

**Full Phase 0 gate remains open until:**

1. Operator completes QR / messaging / upload / download / notification-click / mic matrix ([WINDOWS_MANUAL.md](WINDOWS_MANUAL.md))
2. macOS notification-click + mic proof ([MACOS_PROOF.md](MACOS_PROOF.md))
3. Legal/branding reviewer accepts [LEGAL_BRANDING_BRIEF.md](LEGAL_BRANDING_BRIEF.md)

Do **not** start Phase 1 monorepo work as if the full gate passed until those three are checked off. Engineering may continue spike/docs work; production scaffolding should wait.

## Environment (automated smoke + interactive launch)

| Field | Value |
|-------|-------|
| Date | 2026-07-26 |
| Operator | Agent smoke + interactive launch |
| OS | Windows win32 |
| Electron | 43.2.0 (pinned) |
| Chromium | 150.0.7871.129 |
| Default UA | Stock Electron (contains `Electron/43.2.0`; app name via `app.setName`, not a Chrome spoof) |
| userData | `%APPDATA%\multi-whatsapp-desktop` |
| Partitions | `persist:wa-a0000000-0000-4000-8000-000000000001`, `persist:wa-a0000000-0000-4000-8000-000000000002` |
| UA spoofing | None |
| WhatsApp preload | None |
| Shell preload | `dist/shell-preload.js` for local toolbar only |
| Smoke artifact | `apps/desktop/smoke-last.json` (`npm run smoke`) |

## Checklist outcomes

| Proof item | Windows | macOS | Notes |
|------------|---------|-------|-------|
| Default Electron identity loads WA | **PASS** (smoke) | Pending Mac | Both views → `https://web.whatsapp.com/` |
| No UA spoofing | **PASS** (code + UA log) | **PASS** (code) | No `setUserAgent` / session UA overrides |
| No unsupported-client block | **PASS** (smoke) | Pending Mac | No block regex match |
| Two QR logins | Pending operator | Pending Mac | See WINDOWS_MANUAL.md |
| Partitions isolated | **PASS** (disk) | Pending Mac | Distinct dirs under `Partitions/wa-…0001` and `…0002` |
| Sessions survive restart | Pending operator | Pending Mac | Needs QR + quit/relaunch |
| Manual messaging | Pending operator | Pending Mac | |
| File upload | Pending operator | Pending Mac | |
| File download | Pending operator | Pending Mac | Handler wired; needs real file |
| Notifications both accounts | Pending operator | Pending Mac | Permission check for WA origin → allow |
| Notification click understood | Pending operator | Pending Mac | Focus→account routing implemented; needs OS toast proof |
| Microphone permission | Pending operator | Pending Mac | `media`/`microphone` allowed for WA origin only |
| No preload/injection needed | **PASS** (code) | **PASS** (code) | |
| Legal/branding accepts model | Pending reviewer | Pending reviewer | Brief ready |

## Notification click observations

### Windows (unsigned / `npm start`)

| Scenario | Observed behavior |
|----------|-------------------|
| App focused | Pending operator |
| App minimized | Pending operator |
| Background account notifies while other active | Pending operator |
| Exact account routing without injection? | Pending — code selects account on `webContents` focus after notification activation |
| Fallback used (if any) | Bring app forward + focus-based account select; never parse notification text |

**Caveat (§12.7):** Development-mode notification behavior is not proof of production (signed installer + App User Model ID) behavior. Re-verify after packaging.

### macOS

| Scenario | Observed behavior |
|----------|-------------------|
| App focused | Not run (no Mac in this environment) — use [MACOS_PROOF.md](MACOS_PROOF.md) |
| App minimized | |
| Background account notifies while other active | |
| Exact account routing without injection? | |
| Fallback used (if any) | |

**Caveat (§12.6):** Unsigned macOS builds may fail to deliver notification events correctly. Production proof requires a code-signed build.

## Code boundary review

| Check | Result |
|-------|--------|
| WA views: no preload | **PASS** |
| No `executeJavaScript` on WA | **PASS** |
| No UA spoof APIs | **PASS** |
| Permissions deny-by-default | **PASS** (origin normalized; notifications allow for WA) |
| Downloads use session `will-download` | **PASS** |
| Default session unused for WA | **PASS** (shell uses `persist:desktop-shell`) |

## Legal / branding

| Field | Value |
|-------|-------|
| Brief | [LEGAL_BRANDING_BRIEF.md](LEGAL_BRANDING_BRIEF.md) |
| Decision | **Pending reviewer** |
| Date | |

## Stop condition

If an unsupported-client block appears later: set verdict to **NO-GO**, do not bypass, reassess product or seek permission. Current smoke: **no block observed**.
