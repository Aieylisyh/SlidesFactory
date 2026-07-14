param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path $DeployDir -Parent
$SyncScript = Join-Path $DeployDir 'sync.ps1'
$CosCli = Join-Path $DeployDir 'tools\coscli.exe'
$CosConfig = Join-Path $DeployDir 'cos.yaml'
$EnvFile = Join-Path $DeployDir 'sync.env'

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw 'Missing deploy/sync.env'
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SyncScript -DryRun
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to prepare COS configuration'
}

if (-not (Test-Path -LiteralPath $CosCli)) {
    throw 'Missing deploy/tools/coscli.exe'
}
if (-not (Test-Path -LiteralPath $CosConfig)) {
    throw 'Missing deploy/cos.yaml'
}

$prefix = ''
Get-Content -Encoding utf8 -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $parts = $line.Split('=', 2)
        if ($parts[0].Trim() -eq 'PREFIX') {
            $prefix = $parts[1].Trim().Trim('/')
        }
    }
}

$targetRoot = 'cos://site/'
if ($prefix) {
    $targetRoot += $prefix + '/'
}

$relativeFiles = @(
    'summerschool/index.html',
    'summerschool/style_extension.css',
    'summerschool/share-pages.json',
    'shared/scripts/deck-focus-nav.js',
    'remoteNavigator/deck-nav-summerschool.json',
    'remoteNavigator/presenter.css',
    'remoteNavigator/presenter.html',
    'remoteNavigator/presenter-summerschool.html',
    'remoteNavigator/remote.css',
    'remoteNavigator/remote.html',
    'remoteNavigator/remote-config.js',
    'remoteNavigator/scripts/focus-profiles.js',
    'remoteNavigator/scripts/presenter-bridge.js',
    'remoteNavigator/scripts/protocol.js',
    'remoteNavigator/scripts/remote-ui.js',
    'remoteNavigator/scripts/vendor/qrcode.min.js',
    'remoteNavigator/scripts/ws-client.js'
)

$relativeDirs = @(
    'summerschool/modules/ice-break'
)

$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($relativePath in $relativeFiles) {
    $fullPath = Join-Path $RepoRoot ($relativePath -replace '/', '\')
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        throw "Missing publish file: $relativePath"
    }
    $files.Add((Get-Item -LiteralPath $fullPath))
}
foreach ($relativeDir in $relativeDirs) {
    $fullDir = Join-Path $RepoRoot ($relativeDir -replace '/', '\')
    if (-not (Test-Path -LiteralPath $fullDir -PathType Container)) {
        throw "Missing publish directory: $relativeDir"
    }
    Get-ChildItem -LiteralPath $fullDir -Recurse -File |
        Where-Object { $_.Name -ne 'README.md' } |
        ForEach-Object { $files.Add($_) }
}

$files = $files | Sort-Object FullName -Unique
Write-Host "Publishing $($files.Count) deck remote / Ice Break files to $targetRoot" -ForegroundColor Cyan

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($RepoRoot.Length + 1).Replace('\', '/')
    $target = $targetRoot + $relativePath
    if ($DryRun) {
        Write-Host "  (DryRun) $relativePath -> $target" -ForegroundColor DarkGray
        continue
    }

    Write-Host "  upload $relativePath" -ForegroundColor DarkGray
    & $CosCli cp $file.FullName $target --config-path $CosConfig
    if ($LASTEXITCODE -ne 0) {
        throw "coscli cp failed: $relativePath"
    }
}

if ($DryRun) {
    Write-Host 'Targeted publish dry run complete.' -ForegroundColor Yellow
} else {
    Write-Host 'Targeted deck remote / Ice Break publish complete.' -ForegroundColor Green
}
