# Publishes a new Gainmark version on GitHub, so installed apps offer it as an update.
#   npm run release                 -> 1.0.3 becomes 1.0.4
#   npm run release -- -Bump minor  -> 1.0.3 becomes 1.1.0
#   npm run release -- -Bump none   -> publish the current version as it is (first release)
#   npm run release -- -Notes "What changed"
# Steps: bump the version (and Android versionCode), build the APK signed with the release key,
# check the APK can update the installed app without losing data, commit and tag, push,
# create the GitHub Release with the APK attached, and deploy the web app (iPhone).
param([ValidateSet('patch', 'minor', 'major', 'none')][string]$Bump = 'patch', [string]$Notes = '')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# Updates only install over the old app (keeping its data) when the APK is signed with the same key.
# This is the public fingerprint of the Gainmark release key (CN=Gainmark), not a secret.
$expectedCert = (Get-Content (Join-Path $PSScriptRoot 'release-cert.sha256') -Raw).Trim().ToLower()

function Stop-Release([string]$why) {
  # Undo the version bump so a failed release leaves nothing behind.
  git checkout -- app.json 2>$null
  Write-Host "STOPPED: $why"
  Write-Host 'Nothing was published.'
  exit 1
}

# The release key must be set up, or updates won't install over earlier versions.
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
if (-not ((Test-Path $props) -and (Select-String -Path $props -Pattern 'GAINMARK_UPLOAD_STORE_FILE' -Quiet))) {
  Write-Host 'No release key found. Restore your backup of %USERPROFILE%\.gainmark and gradle.properties.'
  Write-Host 'Do NOT make a new key: apps signed with another key cannot update without losing data.'
  exit 1
}
if (git status --porcelain) { Write-Host 'Commit or stash your changes first.'; exit 1 }

# Bump the version in app.json.
$version = node -e @"
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const e = j.expo;
const p = e.version.split('.').map(Number);
const bump = '$Bump';
if (bump === 'major') { p[0]++; p[1] = 0; p[2] = 0; }
if (bump === 'minor') { p[1]++; p[2] = 0; }
if (bump === 'patch') { p[2]++; }
e.version = p.join('.');
if (bump !== 'none') e.android.versionCode = (e.android.versionCode || 1) + 1;
fs.writeFileSync('app.json', JSON.stringify(j, null, 2) + '\n');
console.log(e.version);
"@
$versionCode = node -e "console.log(require('./app.json').expo.android.versionCode)"
$tag = "v$version"
Write-Host "=== Releasing Gainmark $version (versionCode $versionCode) ==="

# Build the APK (without installing it).
& (Join-Path $PSScriptRoot 'build-apk.ps1') -NoInstall
if ($LASTEXITCODE -ne 0) { Stop-Release 'the build failed.' }
$built = Join-Path $root 'gainmark.apk'

# === Safety checks: the new APK must install over the old app as an update. ===
Write-Host '=== Checking the APK updates the old app without losing data ==='
$tools = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools') -Directory |
  Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
$signer = Join-Path $tools.FullName 'apksigner.bat'
$aapt = Join-Path $tools.FullName 'aapt2.exe'

# (stdout only: in Windows PowerShell, redirected stderr would stop the script.)
$certs = & $signer verify --print-certs $built | Out-String
if ($LASTEXITCODE -ne 0) { Stop-Release "the APK signature doesn't verify.`n$certs" }
$found = @([regex]::Matches($certs, 'certificate SHA-256 digest: ([0-9a-f]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
if ($found.Count -ne 1 -or $found[0] -ne $expectedCert) {
  Stop-Release "the APK is signed with a different key ($($found -join ', ')). Installed apps could not update without losing data."
}

$badging = (& $aapt dump badging $built | Select-Object -First 1)
if ($badging -notmatch "name='com\.gainmark\.app'") { Stop-Release "the package name changed: $badging" }
if ($badging -notmatch "versionCode='$versionCode'") { Stop-Release "the versionCode is wrong: $badging" }
if ($badging -notmatch "versionName='$([regex]::Escape($version))'") { Stop-Release "the version name is wrong: $badging" }

# The new versionCode must be higher than the latest published release's, or Android refuses the update.
$latestTag = try { gh release view --json tagName --jq .tagName } catch { $null }
if ($latestTag -and $Bump -ne 'none') {
  $prevCode = node -e "try{const j=require('child_process').execFileSync('git',['show',process.argv[1]+':app.json'],{encoding:'utf8'});console.log(JSON.parse(j).expo.android.versionCode||1)}catch(e){console.log(0)}" $latestTag
  if ([int]$prevCode -eq 0) { Stop-Release "couldn't read the versionCode of $latestTag to compare." }
  if ([int]$versionCode -le [int]$prevCode) {
    Stop-Release "versionCode $versionCode is not higher than $prevCode in $latestTag."
  }
}
Write-Host "OK: same release key, package com.gainmark.app, versionCode $versionCode."

$apk = Join-Path $root "gainmark-$tag.apk"
Copy-Item $built $apk -Force

if ($Bump -ne 'none') {
  git add app.json
  git commit -m "Release $tag"
}
git tag $tag
git push origin HEAD --tags

if (-not $Notes) { $Notes = "Gainmark $version" }
gh release create $tag $apk --title "Gainmark $version" --notes $Notes
Write-Host "Android: $tag is on GitHub. Installed apps will offer it as an update."

# === Web app (iPhone) ===
# GitHub Pages only accepts deploys from the main branch, so deploy from there rather than from the tag.
Write-Host '=== Deploying the web app ==='
$branch = git branch --show-current
gh workflow run web.yml --ref $branch
Start-Sleep -Seconds 8
$runId = gh run list --workflow web.yml --branch $branch --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --exit-status | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host 'Web app: deployed (https://rozevelt.github.io/Gainmark/).'
  Write-Host "DONE: Gainmark $version is out on Android and iPhone."
} else {
  Write-Host "Web app: the deploy FAILED. The Android release is out. Retry with: gh workflow run web.yml --ref $branch"
  exit 1
}
