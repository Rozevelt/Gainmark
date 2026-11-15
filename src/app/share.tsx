import { useState } from 'react';
import { Image, Pressable, Share, StyleSheet, View } from 'react-native';

import { Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { REPO_URL } from '@/lib/updates';
import { radius, useColors } from '@/theme';

const TARGETS = {
  iphone: {
    label: 'iPhone',
    url: 'https://rozevelt.github.io/Gainmark/',
    qr: require('@/assets/images/qr/qr-iphone.png'),
    steps:
      'Scan with the Camera app and open the link in Safari. The page shows how to add Gainmark to the Home Screen.',
  },
  android: {
    label: 'Android',
    url: `${REPO_URL}/releases/latest`,
    qr: require('@/assets/images/qr/qr-android.png'),
    steps:
      'Scan with the camera, download the .apk file and open it. Android may ask to allow installs from the browser.',
  },
} as const;

type Target = keyof typeof TARGETS;

/** A QR code a friend can scan to get Gainmark, for iPhone (web app) or Android (APK). */
export default function ShareScreen() {
  const c = useColors();
  const [target, setTarget] = useState<Target>('iphone');
  const t = TARGETS[target];

  return (
    <SettingsPage title="Share Gainmark">
      <View style={[settingsStyles.segment, styles.segment, { backgroundColor: c.surface2 }]}>
        {(Object.keys(TARGETS) as Target[]).map((k) => (
          <Pressable
            key={k}
            onPress={() => setTarget(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: target === k }}
            style={[styles.segmentItem, target === k && { backgroundColor: c.accent }]}>
            <Text style={[settingsStyles.segmentText, { color: target === k ? c.onAccent : c.text }]}>
              {TARGETS[k].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* The code stays black on white in both themes, so every camera can read it. */}
      <View style={styles.qrCard}>
        <Image source={t.qr} style={styles.qr} accessibilityLabel={`QR code for ${t.url}`} />
      </View>

      <Text style={[styles.url, { color: c.textDim }]} selectable>
        {t.url.replace('https://', '')}
      </Text>

      <Section>
        <View style={settingsStyles.box}>
          <Text style={[settingsStyles.note, { color: c.text }]}>{t.steps}</Text>
        </View>
      </Section>

      <Button
        title="Send the link"
        icon="share"
        variant="secondary"
        onPress={() => Share.share({ message: `Gainmark for ${t.label}: ${t.url}` }).catch(() => {})}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  segment: { alignSelf: 'center' },
  segmentItem: { paddingHorizontal: 28, height: 34, borderRadius: 6, justifyContent: 'center' },
  qrCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
  },
  qr: { width: 240, height: 240 },
  url: { fontSize: 13, textAlign: 'center', marginTop: -8 },
});
