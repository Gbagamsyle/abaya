param(
    [switch]$DryRun,
    [switch]$Write,
    [string]$Project = "",
    [ValidateSet("production", "preview", "development")]
    [string]$Environment = "production",
    [switch]$TransferToVercel,
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"

$commerceRoot = Split-Path -Parent $PSScriptRoot
$scriptFile = Join-Path $PSScriptRoot "run-direct-publishable-key-initializer.ps1"

$env:PGHOST = "127.0.0.1"
$env:PGPORT = "55432"
$env:DRY_RUN = if ($DryRun) { "true" } else { "false" }
$env:ALLOW_PUBLISHABLE_KEY_INITIALIZATION = if ($Write) { "true" } else { "false" }

if ($TransferToVercel) {
    $env:VERCEL_TRANSFER_TO_VERCEL = "true"
    $env:VERCEL_PROJECT = $Project
    $env:VERCEL_ENVIRONMENT = $Environment
    $env:VERCEL_TRANSFER_CONFIRM = if ($Confirm) { "true" } else { "false" }
}

& railway run --service "@fenomena/commerce" --environment production -- powershell.exe -NoLogo -ExecutionPolicy Bypass -NoProfile -File $scriptFile
