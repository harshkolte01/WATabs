# Phase 7 — Manual smoke (packaging & updates)

## Prerequisites

- Signed certs in GitHub secrets (see `docs/phase7-secrets.md`) for production releases
- Without certs, `release.yml` still builds unsigned artifacts (dev/test only)

## Fresh install

1. Install Windows Setup from a GitHub Release (or local `pnpm make` output).
2. Launch WATabs, add two accounts, scan QR for each.
3. Confirm both stay logged in after restart.

## Upgrade preserves partitions

1. With two logged-in accounts, install the next version over the current one (or apply in-app update when feed exists).
2. Restart.
3. **Pass:** both accounts still logged in; labels/order unchanged.
4. **Fail:** any wiped session or shared partition.

Hard rule: updater/installer must never delete `userData` partition folders.

## Channels

1. Settings → Updates → channel **Beta**.
2. Check for updates (packaged build only).
3. Switch back to **Stable**.

## Uninstall policy

- Uninstalling the app may leave `userData` (sessions) on disk depending on OS/installer.
- Clearing an account in-app removes only that account’s partition.
- Document for users: uninstall ≠ delete WhatsApp account on phone.

## macOS

Apple signing and notarization are **out of scope**. CI may publish an unsigned ZIP only.

1. Build on `macos-latest` (Windows `.exe` will not run on Mac).
2. Treat unsigned macOS builds as local/test only (Gatekeeper will warn or block).
3. Primary release target remains Windows.

## Acceptance (Step 7)

Only when all pass, set `site/phase7-status.json` → `"autoUpdateLive": true`.
