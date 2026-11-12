# Builds a standalone release APK of Gainmark (for arm64 phones), saves it as gainmark.apk in the
# project folder and installs it on the phone plugged in over USB (keeping the app's data).
#   npm run apk
# Needs: the Android SDK in %LOCALAPPDATA%\Android\Sdk and a JDK 21 in C:\Program Files\Eclipse Adoptium.
# Note: the SDK's CMake 3.22.1 ninja.exe was replaced with the one from CMake 3.31.6 (ninja 1.12.1),
# because the old one can't handle the long build paths on Windows (original kept as ninja.exe.bak).

param([switch]$NoInstall)

$root = Split-Path $PSScriptRoot -Parent
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $jdk) { Write-Host 'JDK 21 not found in C:\Program Files\Eclipse Adoptium'; exit 1 }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + (Join-Path $env:ANDROID_HOME 'platform-tools') + ';' + $env:Path

Write-Host '=== 1/3 Native project (expo prebuild) ==='
Set-Location $root
npx expo prebuild -p android --clean --no-install
if ($LASTEXITCODE -ne 0) { Write-Host 'BUILD FAILED (prebuild)'; exit 1 }

Write-Host '=== 2/3 Release build (gradle) ==='
Set-Location (Join-Path $root 'android')
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
$code = $LASTEXITCODE
Set-Location $root
if ($code -ne 0) { Write-Host 'BUILD FAILED (gradle)'; exit 1 }
Copy-Item (Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk') (Join-Path $root 'gainmark.apk') -Force
Write-Host "Built $(Join-Path $root 'gainmark.apk')"

if ($NoInstall) { exit 0 }

Write-Host '=== 3/3 Install on the phone ==='
$adb = Get-Command adb -ErrorAction SilentlyContinue
$adbPath = if ($adb) { $adb.Source } else { Join-Path $env:USERPROFILE 'Downloads\scrcpy-win64-v3.3.3\scrcpy-win64-v3.3.3\adb.exe' }
& $adbPath install -r (Join-Path $root 'gainmark.apk')
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Built, but installing failed. Is the phone plugged in and unlocked?'
  Write-Host 'If it says the signatures do not match: the installed copy was signed with the old key.'
  Write-Host 'Export your data in Gainmark, uninstall it, run this again, then import the data.'
  exit 1
}
Write-Host 'DONE: Gainmark is installed on the phone.'
