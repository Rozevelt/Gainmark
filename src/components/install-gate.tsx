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

const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/**
 * Shown instead of the app when it's opened in a browser tab on a phone: Gainmark runs from
 * the home screen, fullscreen.
 */
export function InstallGate() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const android = isAndroid();

  const steps = android
    ? [
        'Tap the ⋮ menu at the top right of Chrome.',
        'Tap “Add to Home screen” (or “Install app”).',
        'Open Gainmark from your home screen.',
      ]
    : [
        'Tap the Share button in Safari (the square with an arrow, at the bottom or next to the address).',
        'Scroll down and tap “Add to Home Screen”.',
        'Tap Add, then open Gainmark from your Home Screen.',
      ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
      <Text style={[styles.title, { color: c.text }]}>Add Gainmark to your Home Screen</Text>
      <Text style={[styles.body, { color: c.textDim }]}>
        Gainmark runs as an app from your Home Screen, fullscreen and offline. It doesn&apos;t run in a browser tab.
      </Text>

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

      <Text style={[styles.note, { color: c.textFaint }]}>
        Your workouts are saved on this phone. Deleting the Home Screen icon deletes them too, so use Export in Settings
        now and then.
      </Text>

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
  card: { borderRadius: radius.lg, borderWidth: 1, marginTop: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  number: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 14, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21 },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  link: { fontSize: 13, textAlign: 'center', marginTop: 8 },
});
