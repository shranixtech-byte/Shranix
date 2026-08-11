# ═══════════════════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Windows Installer Build (Phase 14)
# ═══════════════════════════════════════════════════════════════════════════
# Prerequisites (run in a Windows terminal with Rust installed):
#   1. Rust toolchain  (https://rustup.rs)  — required by Tauri
#   2. Node.js 18+ and pnpm
#   3. WiX toolset OR NSIS — Tauri bundles MSI (WiX) and EXE (NSIS) when the
#      platform tools are available. See src-tauri/tauri.conf.json → bundle.
#
# What this builds:
#   - The SHRANIX frontend (production bundle)
#   - The Tauri desktop shell (src-tauri)
#   - NSIS installer (.exe) + MSI — both configured in tauri.conf.json
#
# The installer contains the activation client and first-run activation UI.
# It NEVER contains: private signing keys, server credentials, admin
# credentials, or the RSA private key used to sign license tokens.
# ═══════════════════════════════════════════════════════════════════════════
$ErrorActionPreference = 'Stop'

Write-Host "==> 1/4 Building SHRANIX frontend (production)..." -ForegroundColor Cyan
Push-Location ..\..\frontend
pnpm install --frozen-lockfile
pnpm build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
Pop-Location

Write-Host "==> 2/4 Bundling desktop application (Tauri)..." -ForegroundColor Cyan
Push-Location ..\..\desktop
pnpm tauri build --bundles nsis,msi
if ($LASTEXITCODE -ne 0) { throw "Tauri bundle failed" }
Pop-Location

Write-Host "==> 3/4 Verifying artifacts..." -ForegroundColor Cyan
$artifacts = Get-ChildItem ..\..\desktop\src-tauri\target\release\bundle -Recurse -Include *.exe,*.msi -ErrorAction SilentlyContinue
if (-not $artifacts) { throw "No installer artifacts found" }
$artifacts | ForEach-Object { Write-Host "   - $($_.FullName) ($([math]::Round($_.Length / 1MB, 1)) MB)" -ForegroundColor Green }

Write-Host "==> 4/4 Code signing (optional, production only)..." -ForegroundColor Cyan
Write-Host @"
   Production installers MUST be signed with a trusted code-signing
   certificate before distribution. The private signing certificate must
   live in a secure signing environment — never in this repository.
   Example (signtool.exe from Windows SDK):
     signtool sign /fd SHA256 /a /f <path-to.pfx> /p <password> ^
       src-tauri/target/release/bundle/nsis/*-setup.exe
"@ -ForegroundColor Yellow

Write-Host "Installer build complete." -ForegroundColor Green
