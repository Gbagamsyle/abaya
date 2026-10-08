$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
    throw "DATABASE_URL was not supplied. Run this script through railway run."
}

$builder = [System.UriBuilder]::new([uri]$env:DATABASE_URL)
$builder.Host = "127.0.0.1"
$builder.Port = 55432

$env:DATABASE_URL = $builder.Uri.AbsoluteUri
$env:NODE_ENV = "production"

Write-Host "Running read-only Railway diagnostic..."

pnpm --filter @fenomena/commerce diagnose:publishable-key

if ($LASTEXITCODE -ne 0) {
    throw "Diagnostic failed with exit code $LASTEXITCODE"
}