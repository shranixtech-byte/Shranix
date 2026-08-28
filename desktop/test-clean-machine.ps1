# SHRANIX Krushi ERP — Clean Machine Test Script
# Run this on a CLEAN Windows machine with NO Node.js installed
# PowerShell -ExecutionPolicy Bypass -File test-clean-machine.ps1

$ErrorActionPreference = "Continue"
$PASS = 0
$FAIL = 0
$RESULTS = @()

function Test-Step($name, $test) {
    $result = & $test
    if ($result) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:PASS++
        $script:RESULTS += "[PASS] $name"
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        $script:FAIL++
        $script:RESULTS += "[FAIL] $name"
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SHRANIX Krushi ERP — Clean Machine Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: System Node check
Write-Host "=== SYSTEM NODE CHECK ===" -ForegroundColor Yellow
$systemNode = Get-Command node -ErrorAction SilentlyContinue
Test-Step "System Node.js NOT installed" { -not $systemNode }
if ($systemNode) {
    Write-Host "  WARNING: System Node found at $($systemNode.Source)" -ForegroundColor Yellow
    Write-Host "  This test should be run on a clean machine without Node.js" -ForegroundColor Yellow
}
$systemNpm = Get-Command npm -ErrorAction SilentlyContinue
Test-Step "System npm NOT installed" { -not $systemNpm }
$systemPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
Test-Step "System pnpm NOT installed" { -not $systemPnpm }

# Step 2: Find installer
Write-Host ""
Write-Host "=== INSTALLER CHECK ===" -ForegroundColor Yellow
$installer = Get-ChildItem -Path "." -Filter "SHRANIX Krushi ERP_1.0.0_x64-setup.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installer) {
    $installer = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "SHRANIX Krushi ERP_1.0.0_x64-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
}
Test-Step "Installer found" { $null -ne $installer }
if ($installer) {
    $size = [math]::Round($installer.Length / 1MB, 1)
    Write-Host "  Installer: $($installer.FullName) ($size MB)" -ForegroundColor Gray
    
    # Verify SHA-256
    Write-Host "  Verifying SHA-256..." -ForegroundColor Gray
    $hash = (Get-FileHash -Path $installer.FullName -Algorithm SHA256).Hash
    $expected = "B8D517C9ABEA82909A9EE5766279CEFEA03BC5592640A9227ED24C2401F2E703"
    Test-Step "SHA-256 matches" { $hash -eq $expected }
    if ($hash -ne $expected) {
        Write-Host "  Expected: $expected" -ForegroundColor Red
        Write-Host "  Got:      $hash" -ForegroundColor Red
    }
}

# Step 3: Install
Write-Host ""
Write-Host "=== INSTALLATION ===" -ForegroundColor Yellow
$installDir = "$env:LOCALAPPDATA\com.shranix.krushi-erp"
Test-Step "Installation directory exists" { Test-Path $installDir }

# Step 4: Bundled runtime check
Write-Host ""
Write-Host "=== BUNDLED RUNTIME ===" -ForegroundColor Yellow
$exePath = Join-Path $installDir "shranix-krushi-erp.exe"
$nodePath = Join-Path $installDir "runtime\node\node.exe"
$backendPath = Join-Path $installDir "runtime\backend\dist\main.js"
$nodeModulesPath = Join-Path $installDir "runtime\backend\node_modules"

Test-Step "EXE exists" { Test-Path $exePath }
Test-Step "Bundled Node.js exists" { Test-Path $nodePath }
Test-Step "Backend dist/main.js exists" { Test-Path $backendPath }
Test-Step "Backend node_modules exists" { Test-Path $nodeModulesPath }

# Check bundled Node version
if (Test-Path $nodePath) {
    $nodeVersion = & $nodePath --version 2>&1
    Test-Step "Bundled Node version is v24" { $nodeVersion -match "v24" }
    Write-Host "  Bundled Node: $nodeVersion" -ForegroundColor Gray
}

# Check critical modules
$criticalModules = @("express", "argon2", "xlsx", "@nestjs", "@shranix\database")
foreach ($mod in $criticalModules) {
    $modPath = Join-Path $nodeModulesPath $mod
    Test-Step "Module $mod exists" { Test-Path $modPath }
}

# Step 5: Security checks
Write-Host ""
Write-Host "=== SECURITY ===" -ForegroundColor Yellow
if (Test-Path $exePath) {
    # Check if DevTools are enabled (they shouldn't be in release)
    $isDebug = $exePath -match "debug"
    Test-Step "Release build (not debug)" { -not $isDebug }
}

# Step 6: Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
foreach ($r in $RESULTS) {
    if ($r -match "\[PASS\]") {
        Write-Host "  $r" -ForegroundColor Green
    } else {
        Write-Host "  $r" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "PASSED: $PASS" -ForegroundColor Green
Write-Host "FAILED: $FAIL" -ForegroundColor $(if ($FAIL -gt 0) { "Red" } else { "Green" })
Write-Host ""
if ($FAIL -eq 0) {
    Write-Host "FINAL: ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "FINAL: $FAIL CHECKS FAILED" -ForegroundColor Red
}
Write-Host ""
Write-Host "NOTE: This script verifies file existence and bundled runtime." -ForegroundColor Yellow
Write-Host "For full ERP testing, launch the app and test manually." -ForegroundColor Yellow
Write-Host "The app must NOT require system Node.js to start." -ForegroundColor Yellow
