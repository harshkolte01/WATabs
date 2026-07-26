# Phase 7 — CI secret names (values never in git)

Store these only in GitHub Actions secrets (or your org secret store).  
Do **not** put values in the repo, `.env` committed to git, renderer/preload code, or packaged app resources.

## Windows

| Secret name | Purpose |
| --- | --- |
| `WINDOWS_CODE_SIGN_CERT` | Base64-encoded `.pfx` / `.p12` (decoded in release CI to `WINDOWS_CODE_SIGN_CERT_PATH`) |
| `WINDOWS_CODE_SIGN_PASSWORD` | Certificate password |

Release CI sets `WINDOWS_CODE_SIGN_CERT_PATH` for Forge `packagerConfig.windowsSign`.

**Self-signed (current):** run `scripts/generate-self-signed-windows-cert.ps1`, then copy `.secrets/watabs-codesign.b64.txt` and `.secrets/watabs-codesign.password.txt` into those secrets. See `docs/WINDOWS_SIGNED_RELEASE.md`.

## macOS

**Out of scope.** We are not collecting Apple Developer ID certificates or App Store Connect notarization credentials.  
Release CI may still produce an **unsigned** macOS ZIP for local/testing use; it is not Gatekeeper-ready for public distribution.

## Updates & publish

| Secret name | Purpose |
| --- | --- |
| `UPDATE_SIGN_PRIVATE_KEY` | Private key for signed update metadata / packages (when enabled) |
| `GH_RELEASE_TOKEN` | Optional; otherwise `GITHUB_TOKEN` with `contents: write` on the release workflow |

## Rules

- Never echo secret values in CI logs.
- Fork PRs must not receive release secrets.
- Rotate keys if a workflow log or artifact leak is suspected.
