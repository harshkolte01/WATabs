# Windows signed releases

macOS Apple signing stays out of scope.

## Installer (NSIS)

Windows releases use an **NSIS assisted wizard** (`WATabs-<version>-Setup.exe`):

- Choose install folder
- Desktop / Start Menu shortcut options
- Launch after finish

“Start at login” is an in-app Settings toggle (not an installer page).

Release assets also include `latest.yml` (and `.blockmap` when produced) for `electron-updater`.

### Migrating from older Squirrel builds

Pre-0.1.4 Windows builds used Squirrel one-click (`%LocalAppData%\WATabs`). Uninstall that copy from **Settings → Apps** before installing the NSIS build, or you can end up with two installs.

### Taskbar icon looks wrong after upgrade

Windows caches icons under the App User Model ID. After installing a new build:

1. Uninstall old WATabs (Squirrel and/or NSIS)
2. Delete leftover `%LocalAppData%\WATabs` if present
3. Unpin WATabs from the taskbar, then reinstall and pin again
4. If still stale: sign out/in, or run `ie4uinit.exe -show`

### Blank window / “Get an app to open this 'watabs' link”

Fixed in **0.1.5+**: the shell `watabs://` handler must be registered on the `persist:desktop-shell` session (not only the default session). Rebuild/reinstall past that version.

## Self-signed (what we use now)

Good for: proving the CI signing pipeline, local installs, tester builds.  
**Not** good for: public users — SmartScreen will still show “unknown publisher”.

### 1. Generate the PFX (once)

From repo root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-self-signed-windows-cert.ps1
```

Creates (gitignored under `.secrets/`):

| File | Use |
| --- | --- |
| `watabs-codesign.pfx` | Local signing |
| `watabs-codesign.password.txt` | → GitHub secret `WINDOWS_CODE_SIGN_PASSWORD` |
| `watabs-codesign.b64.txt` | → GitHub secret `WINDOWS_CODE_SIGN_CERT` |

### 2. Add GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions**:

1. `WINDOWS_CODE_SIGN_CERT` = paste **entire** `.secrets/watabs-codesign.b64.txt`
2. `WINDOWS_CODE_SIGN_PASSWORD` = paste `.secrets/watabs-codesign.password.txt`

Never commit `.secrets/` or the PFX.

### 3. Local signed make (optional)

```powershell
$env:WINDOWS_CODE_SIGN_CERT_PATH = "$PWD\.secrets\watabs-codesign.pfx"
$env:WINDOWS_CODE_SIGN_PASSWORD = Get-Content "$PWD\.secrets\watabs-codesign.password.txt" -Raw
pnpm --filter @multi-whatsapp/desktop run make
```

### 4. Cut a release tag

```bash
git push origin HEAD
git tag v0.1.0
git push origin v0.1.0
```

Actions → **Release** should decode the cert, sign Setup, and run **Verify Authenticode signature**.  
Self-signed may report `Status: UnknownError` / not `Valid` on a clean runner if the cert isn’t in the trust store — see note below.

### Authenticode “Valid” on CI

`Get-AuthenticodeSignature` returns `Valid` only if Windows trusts the issuer. For self-signed, import the cert into the runner’s **Trusted Root** before verify, or accept `HashMismatch`/`UnknownError` locally while still confirming a signature **exists**.

Release workflow treats self-signed as: signature present (SignerCertificate not null). For CA certs, require `Status -eq Valid`.

### 5. Smoke

Install Setup, check Properties → Digital Signatures (publisher: `WATabs Dev (self-signed)`), run `docs/PHASE7_MANUAL_SMOKE.md`.

---

## Later: CA-issued (real public trust)

When you want normal users without scary SmartScreen prompts, buy OV/EV, replace the two GitHub secrets with the CA `.pfx` Base64 + password, retag. Same pipeline — only the cert changes.
