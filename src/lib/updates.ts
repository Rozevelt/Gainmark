import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import { choose, notify } from '@/lib/confirm';

/** Where Gainmark lives on GitHub; new versions are published as GitHub Releases there. */
export const REPO = 'Rozevelt/Gainmark';
export const REPO_URL = `https://github.com/${REPO}`;

/** Not a `gm:` key, so backups and imports leave it alone. */
const LAST_CHECK_KEY = 'app:lastUpdateCheck';
const DAY = 24 * 60 * 60 * 1000;

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/** "1.2.10" > "1.2.9": compares number by number. */
export function isNewer(candidate: string, current: string) {
  const a = candidate
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const b = current
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export type Release = { version: string; notes: string; pageUrl: string; apkUrl: string | null };

/** The newest published release on GitHub, or null if it can't be reached. */
export async function latestRelease(): Promise<Release | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const r = await res.json();
    const apk = (r.assets ?? []).find((a: { name: string }) => a.name.toLowerCase().endsWith('.apk'));
    return {
      version: String(r.tag_name ?? '').replace(/^v/i, ''),
      notes: String(r.body ?? '').trim(),
      pageUrl: String(r.html_url ?? REPO_URL),
      apkUrl: apk?.browser_download_url ?? null,
    };
  } catch {
    return null;
  }
}

function offer(r: Release) {
  const notes = r.notes ? `\n\n${r.notes.length > 400 ? `${r.notes.slice(0, 400)}…` : r.notes}` : '';
  choose('Update available', `Gainmark ${r.version} is out (you have ${appVersion()}).${notes}`, [
    { text: 'Later', style: 'cancel' },
    {
      // Android downloads the APK and installs it over this one (your data stays).
      text: Platform.OS === 'android' && r.apkUrl ? 'Download' : 'Open',
      onPress: () => Linking.openURL(Platform.OS === 'android' && r.apkUrl ? r.apkUrl : r.pageUrl),
    },
  ]);
}

/** On app start: at most once a day, and only in the installed app (not while developing). */
export async function autoCheckForUpdate() {
  if (__DEV__ || Platform.OS === 'web') return;
  try {
    const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;
    if (Date.now() - last < DAY) return;
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    return;
  }
  const r = await latestRelease();
  if (r && isNewer(r.version, appVersion())) offer(r);
}

/** From Settings: always checks, and says so when there's nothing new. */
export async function checkForUpdateNow() {
  const r = await latestRelease();
  if (!r) {
    notify("Couldn't check", 'No connection to GitHub, or no version has been published yet.');
    return;
  }
  if (isNewer(r.version, appVersion())) offer(r);
  else notify('Up to date', `You have the latest version (${appVersion()}).`);
}
