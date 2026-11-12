// Signs release builds with Gainmark's own key instead of the shared debug key.
//
// The key and its passwords live outside the project (they must never be on GitHub), in
// %USERPROFILE%\.gradle\gradle.properties:
//   GAINMARK_UPLOAD_STORE_FILE=C:/Users/<you>/.gainmark/gainmark-release.keystore
//   GAINMARK_UPLOAD_STORE_PASSWORD=...
//   GAINMARK_UPLOAD_KEY_ALIAS=gainmark
//   GAINMARK_UPLOAD_KEY_PASSWORD=...
// Without them, release builds fall back to the debug key (fine for trying things out).
// Every update must be signed with the same key, or Android won't install it over the old app.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = 'GAINMARK_UPLOAD_STORE_FILE';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;

    const signing = `signingConfigs {
        release {
            if (project.hasProperty('${MARK}')) {
                storeFile file(project.property('${MARK}'))
                storePassword project.property('GAINMARK_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('GAINMARK_UPLOAD_KEY_ALIAS')
                keyPassword project.property('GAINMARK_UPLOAD_KEY_PASSWORD')
            }
        }`;
    if (!/signingConfigs\s*\{/.test(gradle)) throw new Error('with-release-signing: signingConfigs block not found');
    gradle = gradle.replace(/signingConfigs\s*\{/, signing);

    const releaseUse = /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/;
    if (!releaseUse.test(gradle)) throw new Error('with-release-signing: release signingConfig not found');
    gradle = gradle.replace(
      releaseUse,
      `$1signingConfig project.hasProperty('${MARK}') ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
