$ErrorActionPreference = "Stop"

$commerceRoot = Split-Path -Parent $PSScriptRoot
$entry = Join-Path $commerceRoot "src\scripts\direct-publishable-key-initializer.ts"

& pnpm --dir $commerceRoot exec tsx $entry
