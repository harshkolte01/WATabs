# Generates a self-signed Authenticode-capable PFX for local/CI testing.
# NOT trusted by Windows SmartScreen for other users — replace with a CA cert for production.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/generate-self-signed-windows-cert.ps1
#
# Outputs (gitignored):
#   .secrets/watabs-codesign.pfx
#   .secrets/watabs-codesign.password.txt
#   .secrets/watabs-codesign.b64.txt   (paste into GitHub secret WINDOWS_CODE_SIGN_CERT)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $root ".secrets"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$pfxPath = Join-Path $outDir "watabs-codesign.pfx"
$passwordPath = Join-Path $outDir "watabs-codesign.password.txt"
$b64Path = Join-Path $outDir "watabs-codesign.b64.txt"

# Random password (also written to file for you to copy into GitHub secrets).
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
$passwordPlain = [Convert]::ToBase64String($bytes) -replace "[+/=]", "x"
$secure = ConvertTo-SecureString -String $passwordPlain -Force -AsPlainText

Write-Host "Creating self-signed code-signing certificate..."
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=WATabs Dev (self-signed)" `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyExportPolicy Exportable `
  -NotAfter (Get-Date).AddYears(3)

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secure | Out-Null

# Remove from CurrentUser store so the private key isn't left lingering (PFX is enough).
Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force -ErrorAction SilentlyContinue

Set-Content -Path $passwordPath -Value $passwordPlain -NoNewline -Encoding ascii
[Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxPath)) |
  Set-Content -Path $b64Path -NoNewline -Encoding ascii

Write-Host ""
Write-Host "Wrote:"
Write-Host "  $pfxPath"
Write-Host "  $passwordPath"
Write-Host "  $b64Path"
Write-Host ""
Write-Host "GitHub Actions secrets:"
Write-Host "  WINDOWS_CODE_SIGN_CERT     <- contents of watabs-codesign.b64.txt"
Write-Host "  WINDOWS_CODE_SIGN_PASSWORD <- contents of watabs-codesign.password.txt"
Write-Host ""
Write-Host "Local make:"
Write-Host "  `$env:WINDOWS_CODE_SIGN_CERT_PATH = `"$pfxPath`""
Write-Host "  `$env:WINDOWS_CODE_SIGN_PASSWORD = (Get-Content `"$passwordPath`" -Raw)"
Write-Host "  pnpm --filter @multi-whatsapp/desktop run make"
Write-Host ""
Write-Host "Note: self-signed = SmartScreen will still warn other users."
