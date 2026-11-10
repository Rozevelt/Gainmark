# Runs Gainmark on the Android phone plugged in over USB.
#   npm run phone        -> start the dev server; the installed app live-updates as code changes
#   npm run phone:build  -> rebuild + reinstall the app (only needed after native changes:
#                           new native libraries, app.json icon/name/permission changes)
param([switch]$Build)

$ErrorActionPreference = 'Stop'

# Use the Android SDK in the default location and JDK 17 for Gradle, for this process only.
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $jdk) { throw 'JDK 17 not found in C:\Program Files\Eclipse Adoptium' }
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin;$env:Path"

$devices = adb devices | Select-String -Pattern "`tdevice$"
if (-not $devices) {
  Write-Host 'No phone found. Plug it in, unlock it and allow USB debugging.' -ForegroundColor Yellow
  exit 1
}

# Let the phone reach the dev server on this PC through the USB cable.
adb reverse tcp:8081 tcp:8081 | Out-Null

Set-Location (Split-Path $PSScriptRoot -Parent)
if ($Build) {
  npx expo run:android
} else {
  npx expo start --dev-client
}
