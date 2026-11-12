# Publishes a new Gainmark version on GitHub, so installed apps offer it as an update.
#   npm run release                 -> 1.0.3 becomes 1.0.4
#   npm run release -- -Bump minor  -> 1.0.3 becomes 1.1.0
#   npm run release -- -Bump none   -> publish the current version as it is (first release)
#   npm run release -- -Notes "What changed"
# Steps: bump the version (and Android versionCode), build the APK signed with the release key,
# commit and tag, push, and create the GitHub Release with the APK attached.
param([ValidateSet('patch', 'minor', 'major', 'none')][string]$Bump = 'patch', [string]$Notes = '')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# The release key must be set up, or updates won't install over earlier versions.
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
if (-not ((Test-Path $props) -and (Select-String -Path $props -Pattern 'GAINMARK_UPLOAD_STORE_FILE' -Quiet))) {
  Write-Host 'No release key found. Run scripts/make-signing-key.ps1 first.'; exit 1
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
$tag = "v$version"
Write-Host "=== Releasing Gainmark $version ==="

# Build the APK (without installing it).
& (Join-Path $PSScriptRoot 'build-apk.ps1') -NoInstall
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed - nothing was published.'; exit 1 }
$apk = Join-Path $root "gainmark-$tag.apk"
Copy-Item (Join-Path $root 'gainmark.apk') $apk -Force

if ($Bump -ne 'none') {
  git add app.json
  git commit -m "Release $tag"
}
git tag $tag
git push origin HEAD --tags

if (-not $Notes) { $Notes = "Gainmark $version" }
gh release create $tag $apk --title "Gainmark $version" --notes $Notes
Write-Host "DONE: $tag is on GitHub. Installed apps will offer it as an update."
