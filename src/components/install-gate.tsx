import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { REPO_URL } from '@/lib/updates';
import { radius, useColors } from '@/theme';

/** On a phone, in a browser tab (not opened from the home screen). */
export function needsInstall(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  const phone = /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
  return phone && !standalone;
}

/** Built-in browsers of other apps: they can't add anything to the Home Screen. */
const IN_APP: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i, 'Facebook'],
  [/Snapchat/i, 'Snapchat'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Twitter/i, 'X'],
  [/Line\//i, 'LINE'],
  [/Discord/i, 'Discord'],
  [/WhatsApp/i, 'WhatsApp'],
];

type Browser =
  | { kind: 'in-app'; app: string; ios: boolean }
  | { kind: 'ios'; name: 'Safari' | 'Chrome' | 'Edge' | 'Firefox' }
  | { kind: 'android'; name: 'Chrome' | 'Samsung Internet' | 'Firefox' | 'Edge' };

function detectBrowser(): Browser {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const inApp = IN_APP.find(([re]) => re.test(ua));
  if (inApp) return { kind: 'in-app', app: inApp[1], ios };
  if (ios) {
    if (/CriOS/i.test(ua)) return { kind: 'ios', name: 'Chrome' };
    if (/EdgiOS/i.test(ua)) return { kind: 'ios', name: 'Edge' };
    if (/FxiOS/i.test(ua)) return { kind: 'ios', name: 'Firefox' };
    return { kind: 'ios', name: 'Safari' };
  }
  if (/SamsungBrowser/i.test(ua)) return { kind: 'android', name: 'Samsung Internet' };
  if (/EdgA/i.test(ua)) return { kind: 'android', name: 'Edge' };
  if (/Firefox/i.test(ua)) return { kind: 'android', name: 'Firefox' };
  return { kind: 'android', name: 'Chrome' };
}

/** How to add the app to the Home Screen in this browser. */
function stepsFor(b: Browser): string[] {
  const done = 'Open Gainmark from your Home Screen.';
  if (b.kind === 'in-app') {
    return [
      `Tap the ⋯ or ⋮ menu in ${b.app}’s browser.`,
      b.ios ? 'Choose “Open in Safari” (or “Open in browser”).' : 'Choose “Open in Chrome” (or “Open in browser”).',
      'Then follow the steps shown there to add Gainmark to your Home Screen.',
    ];
  }
  if (b.kind === 'ios') {
    switch (b.name) {
      case 'Chrome':
        return [
          'Tap the Share button in the address bar at the top right.',
          'Scroll down and tap “Add to Home Screen”.',
          `Tap Add. ${done}`,
        ];
      case 'Edge':
        return ['Tap the ⋯ menu at the bottom, then Share.', 'Tap “Add to Home Screen”.', `Tap Add. ${done}`];
      case 'Firefox':
        return ['Tap the ☰ menu at the bottom right, then Share.', 'Tap “Add to Home Screen”.', `Tap Add. ${done}`];
      default:
        return [
          'Tap the Share button (the square with an arrow). On newer iPhones it’s in the ⋯ menu next to the address.',
          'Scroll down and tap “Add to Home Screen”.',
          `Tap Add. ${done}`,
        ];
    }
  }
  switch (b.name) {
    case 'Samsung Internet':
      return ['Tap the ☰ menu at the bottom right.', 'Tap “Add page to”, then “Home screen”.', done];
    case 'Firefox':
      return ['Tap the ⋮ menu.', 'Tap “Add app to Home screen” (or “Install”).', done];
    case 'Edge':
      return ['Tap the ⋯ menu at the bottom.', 'Tap “Add to phone” (or “Add to Home screen”).', done];
    default:
      return ['Tap the ⋮ menu at the top right.', 'Tap “Add to Home screen” (or “Install app”).', done];
  }
}

/**
 * Shown instead of the app when it's opened in a browser tab on a phone: Gainmark runs from
 * the home screen, fullscreen. The steps match the browser it's opened in.
 */
export function InstallGate() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [browser] = useState(detectBrowser);
  const [copied, setCopied] = useState(false);
  const steps = stepsFor(browser);
  const inApp = browser.kind === 'in-app';
  const android = browser.kind === 'android' || (inApp && !browser.ios);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/Gainmark/');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
      <Text style={[styles.title, { color: c.text }]}>
        {inApp ? `Open Gainmark in ${browser.ios ? 'Safari' : 'your browser'}` : 'Add Gainmark to your Home Screen'}
      </Text>
      <Text style={[styles.body, { color: c.textDim }]}>
        {inApp
          ? `You’re in ${browser.app}’s built-in browser, which can’t add apps to the Home Screen.`
          : 'Gainmark runs as an app from your Home Screen, fullscreen and offline. It doesn’t run in a browser tab.'}
      </Text>

      {!inApp ? (
        <Text style={[styles.browser, { color: c.textFaint }]}>
          Steps for {browser.name} on {browser.kind === 'ios' ? 'iPhone' : 'Android'}
        </Text>
      ) : null}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        {steps.map((s, i) => (
          <View
            key={i}
            style={[styles.step, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
            <View style={[styles.number, { backgroundColor: c.accentSoft }]}>
              <Text style={[styles.numberText, { color: c.accent }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: c.text }]}>{s}</Text>
          </View>
        ))}
      </View>

      {inApp ? (
        <>
          <Button
            title={copied ? 'Link copied' : 'Copy link'}
            icon={copied ? 'check' : 'copy'}
            variant="secondary"
            onPress={copyLink}
          />
          <Text style={[styles.note, { color: c.textDim }]}>
            {copied
              ? `Now open ${browser.ios ? 'Safari' : 'Chrome'} and paste it in the address bar.`
              : `Or copy the link and paste it into ${browser.ios ? 'Safari' : 'Chrome'}.`}
          </Text>
        </>
      ) : (
        <Text style={[styles.note, { color: c.textFaint }]}>
          Your workouts are saved on this phone. Deleting the Home Screen icon deletes them too, so use Export in
          Settings now and then.
        </Text>
      )}

      {android ? (
        <>
          <Text style={[styles.note, { color: c.textDim }]}>On Android you can also install the full app instead:</Text>
          <Button
            title="Get the Android app"
            icon="download"
            variant="secondary"
            onPress={() => Linking.openURL(`${REPO_URL}/releases/latest`)}
          />
        </>
      ) : null}

      <Pressable onPress={() => Linking.openURL(REPO_URL)} hitSlop={8} accessibilityRole="link">
        <Text style={[styles.link, { color: c.textFaint }]}>github.com/Rozevelt/Gainmark</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 16, alignItems: 'stretch' },
  logo: { width: 88, height: 88, borderRadius: 20, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  browser: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center', marginBottom: -8 },
  card: { borderRadius: radius.lg, borderWidth: 1, marginTop: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  number: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 14, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21 },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  link: { fontSize: 13, textAlign: 'center', marginTop: 8 },
});
