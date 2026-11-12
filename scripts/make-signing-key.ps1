# One-time setup: creates Gainmark's release signing key and tells Gradle where it is.
#   powershell -ExecutionPolicy Bypass -File scripts/make-signing-key.ps1
# The key goes to %USERPROFILE%\.gainmark and its passwords to %USERPROFILE%\.gradle\gradle.properties,
# both outside the project, so they never end up on GitHub.
# BACK UP the .gainmark folder and those lines somewhere safe: every update must be signed with this
# same key, or Android won't install it over the old app.

$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:USERPROFILE '.gainmark'
$store = Join-Path $dir 'gainmark-release.keystore'
$gradleDir = Join-Path $env:USERPROFILE '.gradle'
$props = Join-Path $gradleDir 'gradle.properties'

if (Test-Path $store) {
  Write-Host "A key already exists at $store - not making a new one."
  exit 0
}
New-Item -ItemType Directory -Force $dir | Out-Null
New-Item -ItemType Directory -Force $gradleDir | Out-Null

# A random 32-character password (letters and digits).
$chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$password = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Sort-Object Name -Descending | Select-Object -First 1
$keytool = Join-Path $jdk.FullName 'bin\keytool.exe'
& $keytool -genkeypair -v -storetype PKCS12 -keystore $store -alias gainmark -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass $password -keypass $password -dname 'CN=Gainmark, O=Gainmark'
if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }

$storePath = $store -replace '\\', '/'
Add-Content -Path $props -Value @(
  '',
  '# Gainmark release signing (keep this private, and back it up with the keystore)',
  "GAINMARK_UPLOAD_STORE_FILE=$storePath",
  "GAINMARK_UPLOAD_STORE_PASSWORD=$password",
  'GAINMARK_UPLOAD_KEY_ALIAS=gainmark',
  "GAINMARK_UPLOAD_KEY_PASSWORD=$password"
)
Write-Host ''
Write-Host "KEY CREATED: $store"
Write-Host "Passwords saved in: $props"
Write-Host 'Back up both somewhere safe (e.g. a USB stick or password manager).'
