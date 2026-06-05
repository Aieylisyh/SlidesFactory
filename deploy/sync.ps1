param(
    [switch]$DryRun,
    [switch]$DeleteRemote
)

if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Need PowerShell 5.1 or newer.'
}

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path $DeployDir -Parent
$EnvFile = Join-Path $DeployDir 'sync.env'
$CosYaml = Join-Path $DeployDir 'cos.yaml'
$ToolsDir = Join-Path $DeployDir 'tools'
$CosCliLogDir = Join-Path $env:TEMP 'sfk-slides-coscli-output'
$CosSnapshotDir = Join-Path $env:TEMP 'sfk-slides-cos-snapshot'
$CosCliName = 'coscli.exe'

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

function Ensure-CosCli {
    param([string]$CustomPath)

    if ($CustomPath -and (Test-Path $CustomPath)) {
        return (Resolve-Path $CustomPath).Path
    }

    $cmd = Get-Command $CosCliName -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $local = Join-Path $ToolsDir $CosCliName
    if (Test-Path $local) { return $local }

    Write-Step 'coscli not found, downloading to deploy/tools ...'
    New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

    $downloadUrl = 'https://github.com/tencentyun/coscli/releases/download/v1.0.8/coscli-v1.0.8-windows-amd64.exe'
    $tempFile = Join-Path $ToolsDir ('coscli-download-' + [guid]::NewGuid().ToString('N') + '.tmp')

    Get-ChildItem -Path $ToolsDir -Filter 'coscli-download*.exe' -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue

    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -UseBasicParsing
        if (Test-Path $local) {
            Remove-Item -Force $local -ErrorAction SilentlyContinue
        }
        Move-Item -Force $tempFile $local
    } catch {
        if (Test-Path $tempFile) {
            Remove-Item -Force $tempFile -ErrorAction SilentlyContinue
        }
        if (Test-Path $local) {
            return $local
        }
        throw "coscli download failed: $($_.Exception.Message). Put $CosCliName in deploy/tools/ or set COSCLI_PATH in sync.env"
    }

    return $local
}

function Get-PublicBaseUrl([hashtable]$Env, [string]$Prefix) {
    if ($Env['PUBLIC_BASE_URL']) {
        return $Env['PUBLIC_BASE_URL'].Trim().TrimEnd('/')
    }

    $bucket = $Env['BUCKET']
    $region = $Env['REGION']
    $path = $Prefix.Trim().TrimEnd('/')
    if ($path -eq '' -or $path -eq '/') {
        return "https://${bucket}.cos-website.${region}.myqcloud.com"
    }

    return "https://${bucket}.cos-website.${region}.myqcloud.com${path}"
}

function Write-CosYamlFromEnv([hashtable]$Env) {
    $bucket = $Env['BUCKET']
    $region = $Env['REGION']
    $endpoint = "cos.$region.myqcloud.com"

    @"
cos:
  base:
    secretid: $($Env['SECRET_ID'])
    secretkey: $($Env['SECRET_KEY'])
    protocol: https
  buckets:
    - name: $bucket
      alias: site
      region: $region
      endpoint: $endpoint
"@ | Set-Content -Path $CosYaml -Encoding UTF8
}

function Show-Cos403Help([hashtable]$Env, [string]$CosCliOutput) {
    $bucket = $Env['BUCKET']
    $region = $Env['REGION']
    $policyExample = Join-Path $DeployDir 'cam-policy.sfkdoc.example.json'
    Write-Host ''
    Write-Host 'COS connection failed (HTTP 403)' -ForegroundColor Red
    if ($CosCliOutput) {
        Write-Host $CosCliOutput -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host "Bucket: $bucket  Region: $region" -ForegroundColor Yellow
    Write-Host 'Check sync.env SecretId/SecretKey (sub-user) and CAM policy on this bucket.'
    Write-Host "Example policy: $policyExample"
    Write-Host ''
}

if (-not (Test-Path $EnvFile)) {
    Write-Host ''
    Write-Host 'Missing deploy/sync.env' -ForegroundColor Yellow
    Write-Host 'Copy deploy/sync.env.example to deploy/sync.env and fill SECRET_ID / SECRET_KEY / BUCKET / REGION'
    Write-Host ''
    exit 1
}

$envMap = Read-EnvFile $EnvFile
$required = @('SECRET_ID', 'SECRET_KEY', 'BUCKET', 'REGION')
foreach ($key in $required) {
    if (-not $envMap[$key]) {
        throw "sync.env missing required key: $key"
    }
}

Write-Step 'Refreshing cos.yaml from sync.env'
Write-CosYamlFromEnv $envMap

$prefix = $envMap['PREFIX']
if (-not $prefix) { $prefix = '/' }
$prefix = $prefix.Trim()
if ($prefix -ne '/' -and -not $prefix.EndsWith('/')) { $prefix += '/' }

$cosTarget = "cos://site$prefix"
$cosCli = Ensure-CosCli -CustomPath $envMap['COSCLI_PATH']
New-Item -ItemType Directory -Force -Path $CosCliLogDir | Out-Null
New-Item -ItemType Directory -Force -Path $CosSnapshotDir | Out-Null

Write-Step "Local repo root: $RepoRoot"
Write-Step "COS prefix (= site root): $cosTarget"

$runtimeDataDir = Join-Path $RepoRoot 'data'
$sourceDataDir = Join-Path $RepoRoot 'contents\data'
if (Test-Path $sourceDataDir) {
    New-Item -ItemType Directory -Force -Path $runtimeDataDir | Out-Null
    Get-ChildItem -Path $sourceDataDir -Filter '*.json' -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $runtimeDataDir $_.Name) -Force
    }
    Write-Step 'Copied contents/data/*.json -> data/ for deploy'
}

$exclude = @(
    'contents/**',
    'deploy/**',
    'coscli_output/**',
    '.cursor/**',
    '.cursorrules',
    '*.md',
    '.git/**',
    '.gitignore'
)

# Sync "." from repo root so PREFIX maps 1:1 (sfkdoc/index.html, sfkdoc/summerschool/…).
# Do NOT pass the folder path as source — coscli would create an extra wrapper (Project/, etc.).
$syncArgs = @(
    'sync',
    '.',
    $cosTarget,
    '-r',
    '--config-path', $CosYaml,
    '--fail-output-path', $CosCliLogDir,
    '--process-log-path', $CosCliLogDir,
    '--snapshot-path', $CosSnapshotDir
)

if ($DeleteRemote) {
    $syncArgs += '--delete'
}

foreach ($pattern in $exclude) {
    $syncArgs += '--exclude'
    $syncArgs += $pattern
}

if ($DryRun) {
    Write-Host '(DryRun: run from repo root, upload contents only — no wrapper folder)' -ForegroundColor Yellow
    Write-Host "  cd `"$RepoRoot`"" -ForegroundColor DarkGray
    Write-Host "  coscli sync . `"$cosTarget`" -r --exclude ..." -ForegroundColor DarkGray
    exit 0
}

Write-Step 'Checking COS access ...'
$accessOutput = & $cosCli ls 'cos://site/' --config-path $CosYaml 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Show-Cos403Help $envMap $accessOutput.Trim()
    throw 'COS access denied (403). Fix credentials or CAM policy, then retry.'
}

Write-Step 'Syncing repo contents (no wrapper folder) ...'
Push-Location $RepoRoot
try {
    & $cosCli @syncArgs
    if ($LASTEXITCODE -ne 0) {
        throw "coscli exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$publicBase = Get-PublicBaseUrl $envMap $prefix

Write-Host ''
Write-Host 'Sync complete' -ForegroundColor Green
Write-Host ''
Write-Host 'Expected COS layout:' -ForegroundColor Cyan
Write-Host "  ${prefix}index.html"
Write-Host "  ${prefix}summerschool/index.html"
Write-Host ''
Write-Host 'Public URLs:' -ForegroundColor Cyan
Write-Host "  Main deck:     $publicBase/index.html"
Write-Host "  Summerschool:  $publicBase/summerschool/"
Write-Host ''
