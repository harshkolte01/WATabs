# Phase 7 — CI secret names (values never in git)

Store these only in GitHub Actions secrets (or your org secret store).  
Do **not** put values in the repo, `.env` committed to git, renderer/preload code, or packaged app resources.

## Windows

| Secret name | Purpose |
| --- | --- |
| `WINDOWS_CODE_SIGN_CERT` | Base64 or file reference for Authenticode cert |
| `WINDOWS_CODE_SIGN_PASSWORD` | Certificate password |

## macOS

| Secret name | Purpose |
| --- | --- |
| `APPLE_DEVELOPER_ID_CERT` | Developer ID Application certificate |
| `APPLE_DEVELOPER_ID_PASSWORD` | Cert export password |
| `APPLE_API_KEY` | App Store Connect API key (`.p8` contents) |
| `APPLE_API_KEY_ID` | API key id |
| `APPLE_API_ISSUER` | API issuer id |
| `APPLE_TEAM_ID` | Apple Developer team id |

## Updates & publish

| Secret name | Purpose |
| --- | --- |
| `UPDATE_SIGN_PRIVATE_KEY` | Private key for signed update metadata / packages |
| `GH_RELEASE_TOKEN` | Token with `contents: write` to publish Releases (or use `GITHUB_TOKEN` with permissions) |

## Rules

- Never echo secret values in CI logs.
- Fork PRs must not receive release secrets.
- Rotate keys if a workflow log or artifact leak is suspected.
