param(
    [switch]$DryRun,
    [switch]$StaticOnly,
    [switch]$RelayOnly,
    [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot

function Write-Step([string]$Message) {
    Write-Host "[*] $Message" -ForegroundColor Cyan
}

$doStatic = -not $RelayOnly
$doRelay = -not $StaticOnly

if ($doStatic) {
    Write-Step '=== Step 1/2: Static site (COS) ==='
    $syncArgs = @()
    if ($DryRun) { $syncArgs += '-DryRun' }
    & (Join-Path $DeployDir 'sync.ps1') @syncArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($doRelay) {
    Write-Step '=== Step 2/2: WebSocket relay (SSH) ==='
    $relayArgs = @()
    if ($DryRun) { $relayArgs += '-DryRun' }
    if ($NoRestart) { $relayArgs += '-NoRestart' }
    & (Join-Path $DeployDir 'quiz-live-relay.ps1') @relayArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host 'quiz-live full deploy finished' -ForegroundColor Green
Write-Host ''
