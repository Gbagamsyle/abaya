$ErrorActionPreference = "Stop"

$commerceRoot = Split-Path -Parent $PSScriptRoot
$scriptFile = Join-Path $PSScriptRoot "run-copy-storefront-publishable-key.ps1"

$env:PGHOST = "127.0.0.1"
$env:PGPORT = "55432"

& railway run --service "@fenomena/commerce" --environment production -- powershell.exe -NoLogo -ExecutionPolicy Bypass -NoProfile -File $scriptFile
