param(
    [switch]$DryRun,
    [switch]$NoRestart
)

if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Need PowerShell 5.1 or newer.'
}

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path $DeployDir -Parent
$EnvFile = Join-Path $DeployDir 'quiz-live-relay.env'

function Write-Step([string]$Message) {
    Write-Host "[*] $Message" -ForegroundColor Cyan
}

function Read-EnvFile([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    Get-Content $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        $map[$key] = $val
    }
    return $map
}

function Get-SshBaseArgs([hashtable]$Env, [switch]$ForScp) {
    $args = @()
    $port = $Env['RELAY_SSH_PORT']
    if ($port) {
        if ($ForScp) {
            $args += '-P'
        } else {
            $args += '-p'
        }
        $args += $port
    }
    $key = $Env['RELAY_SSH_KEY']
    if ($key) {
        if (-not (Test-Path $key)) {
            throw "RELAY_SSH_KEY not found: $key"
        }
        $args += '-i'
        $args += (Resolve-Path $key).Path
    }
    $args += '-o'
    $args += 'StrictHostKeyChecking=accept-new'
    $args += '-o'
    $args += 'ConnectTimeout=15'
    $args += '-o'
    $args += 'BatchMode=yes'
    $args += '-o'
    $args += 'ServerAliveInterval=5'
    $args += '-o'
    $args += 'ServerAliveCountMax=2'
    return $args
}

function Invoke-Ssh([hashtable]$Env, [string[]]$RemoteCommand) {
    $user = $Env['RELAY_USER']
    $hostName = $Env['RELAY_HOST']
    $sshArgs = @(Get-SshBaseArgs $Env) + @("${user}@${hostName}") + $RemoteCommand
    & ssh @sshArgs
    if ($LASTEXITCODE -ne 0) {
        throw "ssh exit code $LASTEXITCODE"
    }
}

function Invoke-Scp([hashtable]$Env, [string]$LocalPath, [string]$RemotePath) {
    $user = $Env['RELAY_USER']
    $hostName = $Env['RELAY_HOST']
    $scpArgs = @(Get-SshBaseArgs $Env -ForScp) + @($LocalPath, "${user}@${hostName}:$RemotePath")
    & scp @scpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "scp exit code $LASTEXITCODE"
    }
}

if (-not (Test-Path $EnvFile)) {
    Write-Host ''
    Write-Host 'Missing deploy/quiz-live-relay.env' -ForegroundColor Yellow
    Write-Host 'Copy deploy/quiz-live-relay.env.example to deploy/quiz-live-relay.env and fill RELAY_HOST / RELAY_USER'
    Write-Host ''
    exit 1
}

foreach ($cmd in @('ssh', 'scp')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "$cmd not found. Enable OpenSSH Client in Windows Optional Features, or use Git Bash."
    }
}

$envMap = Read-EnvFile $EnvFile
$required = @('RELAY_HOST', 'RELAY_USER')
foreach ($key in $required) {
    if (-not $envMap[$key]) {
        throw "quiz-live-relay.env missing required key: $key"
    }
}

$appDir = $envMap['RELAY_APP_DIR']
if (-not $appDir) { $appDir = '/opt/quiz-live' }
$pm2Name = $envMap['RELAY_PM2_NAME']
if (-not $pm2Name) { $pm2Name = 'quiz-relay' }

$uploads = @(
    @{
        Local = Join-Path $RepoRoot 'quiz-live\scripts\quiz-ws-relay.js'
        Remote = "$appDir/scripts/quiz-ws-relay.js"
    },
    @{
        Local = Join-Path $RepoRoot 'quiz-live\data\questions.json'
        Remote = "$appDir/data/questions.json"
    },
    @{
        Local = Join-Path $RepoRoot 'quiz-live\data\broadcast-config.json'
        Remote = "$appDir/data/broadcast-config.json"
    }
)

Write-Step "Target: $($envMap['RELAY_USER'])@$($envMap['RELAY_HOST']):$appDir"

foreach ($item in $uploads) {
    if (-not (Test-Path $item.Local)) {
        throw "Local file missing: $($item.Local)"
    }
}

if ($DryRun) {
    Write-Host '(DryRun — would upload:)' -ForegroundColor Yellow
    foreach ($item in $uploads) {
        Write-Host "  $($item.Local)" -ForegroundColor DarkGray
        Write-Host "    -> $($item.Remote)" -ForegroundColor DarkGray
    }
    if (-not $NoRestart) {
        Write-Host "  pm2 restart $pm2Name" -ForegroundColor DarkGray
    }
    exit 0
}

Write-Step 'Ensuring remote directories exist ...'
Invoke-Ssh $envMap @("mkdir -p $appDir/scripts $appDir/data")

foreach ($item in $uploads) {
    Write-Step "Upload $($item.Local | Split-Path -Leaf) ..."
    Invoke-Scp $envMap $item.Local $item.Remote
}

if (-not $NoRestart) {
    Write-Step "Restart pm2:$pm2Name ..."
    Invoke-Ssh $envMap @("pm2 restart $pm2Name")
    Write-Step 'Health check ...'
    Invoke-Ssh $envMap @("curl -sf http://127.0.0.1:8082/ || echo relay HTTP check failed")
}

Write-Host ''
Write-Host 'Relay deploy complete' -ForegroundColor Green
Write-Host "  Remote: $($envMap['RELAY_HOST']):8082 (WebSocket)" -ForegroundColor Cyan
Write-Host '  Note: room-state.json on server is runtime data — not overwritten.' -ForegroundColor DarkGray
Write-Host ''
