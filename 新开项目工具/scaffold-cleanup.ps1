# Post-copy cleanup for new-deck scaffold (called from new-deck-from-template.bat)
param(
    [Parameter(Mandatory = $true)]
    [string]$DestRoot
)

$ErrorActionPreference = 'SilentlyContinue'

function Remove-IfExists([string]$RelativePath) {
    $full = Join-Path $DestRoot $RelativePath
    if (Test-Path -LiteralPath $full) {
        Remove-Item -LiteralPath $full -Recurse -Force
    }
}

# Remote nav JSON from reference deck / other sites
@(
    'remoteNavigator/deck-nav.json',
    'remoteNavigator/deck-nav-summerschool.json'
) | ForEach-Object { Remove-IfExists $_ }

# Cover / watermark from reference deck (title slide uses text in scaffold)
@(
    'assets/cover-title.png',
    'assets/cover-title.webp',
    'assets/watermark.png',
    'assets/9787559675477.jpg'
) | ForEach-Object { Remove-IfExists $_ }

# Deploy secrets (templates *.example stay)
@(
    'deploy/sync.env',
    'deploy/quiz-live-relay.env',
    'deploy/cos.yaml'
) | ForEach-Object { Remove-IfExists $_ }

# Reference-deck content samples
@(
    'contents/作品集规划.txt',
    'data/salary.json',
    'contents/data/salary.json'
) | ForEach-Object { Remove-IfExists $_ }

# Dev / debug images at assets root
$assetsRoot = Join-Path $DestRoot 'assets'
if (Test-Path -LiteralPath $assetsRoot) {
    Get-ChildItem -LiteralPath $assetsRoot -File |
        Where-Object { $_.Name -match '^(test-|debug-|pdf-page-)' } |
        Remove-Item -Force
}

# PDF / Office sources in contents (keep README.md)
$contentsRoot = Join-Path $DestRoot 'contents'
if (Test-Path -LiteralPath $contentsRoot) {
    Get-ChildItem -LiteralPath $contentsRoot -File -Recurse |
        Where-Object { $_.Extension -match '\.(pdf|pptx?|docx?)$' } |
        Remove-Item -Force
}

# Nested accidental copy from bad path runs (legacy bug artifact)
Get-ChildItem -LiteralPath $DestRoot -Directory |
    Where-Object { $_.Name -match '^\.\.' } |
    Remove-Item -Recurse -Force

exit 0
