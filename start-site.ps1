$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $projectRoot "scripts\serve-site.mjs"
$url = "http://127.0.0.1:4173/site/"

if (-not (Test-Path $serverScript)) {
  Write-Error "Missing server script: $serverScript"
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error "Node.js not found. Please install Node.js first."
}

$existing = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existing) {
  Write-Host "Site server is already running."
  Write-Host "Open: $url"
  Write-Host "PID: $($existing.OwningProcess)"
  return
}

Write-Host "Starting SCI site server..."
Write-Host "Project root: $projectRoot"
Write-Host "Open in browser: $url"
Write-Host "Keep this window open while using the site."
Write-Host ""

Set-Location $projectRoot
& $nodeCmd.Source $serverScript
