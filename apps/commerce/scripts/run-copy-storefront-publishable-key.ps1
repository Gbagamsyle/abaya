$ErrorActionPreference = "Stop"

$commerceRoot = Split-Path -Parent $PSScriptRoot
$entry = Join-Path $commerceRoot "src\scripts\copy-storefront-publishable-key.ts"

& pnpm --dir $commerceRoot exec tsx $entry
