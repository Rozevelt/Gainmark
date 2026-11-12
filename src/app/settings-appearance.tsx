import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Row, Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { DEFAULT_THEME, useStore, type ThemeSettings } from '@/store/store';
import { ACCENTS, palette, radius, useColors, useIsDark } from '@/theme';

const MODES: { id: ThemeSettings['mode']; label: string }[] = [
  { id: 'system', label: 'Phone' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

/** Dark or light, and the accent colour. */
export default function AppearanceSettings() {
  const c = useColors();
  const isDark = useIsDark();
  const theme = useStore((s) => s.settings.theme) ?? DEFAULT_THEME;
  const setTheme = useStore((s) => s.setTheme);

  return (
    <SettingsPage title="Appearance">
      <Section title="THEME">
        <Row label="Look" sub={theme.mode === 'system' ? 'Follows your phone' : undefined} last>
          <View style={[settingsStyles.segment, { backgroundColor: c.surface2 }]}>
            {MODES.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setTheme({ mode: m.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: theme.mode === m.id }}
                style={[styles.modeItem, theme.mode === m.id && { backgroundColor: c.accent }]}>
                <Text style={[settingsStyles.segmentText, { color: theme.mode === m.id ? c.onAccent : c.text }]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </Section>

      <Section title="ACCENT COLOUR">
        <View style={[settingsStyles.box, styles.swatches]}>
          {ACCENTS.map((a) => {
            const p = palette(a.id, isDark);
            const on = theme.accent === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setTheme({ accent: a.id })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={a.name}
                style={styles.swatchItem}>
                <View style={[styles.swatchRing, { borderColor: on ? p.accent : 'transparent' }]}>
                  <View style={[styles.swatch, { backgroundColor: p.accent }]}>
                    {on ? <Icon name="check" size={20} color={p.onAccent} /> : null}
                  </View>
                </View>
                <Text style={[styles.swatchName, { color: on ? c.text : c.textDim }]}>{a.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* A small preview of the accent on a set row. */}
      <Section title="PREVIEW">
        <View style={[settingsStyles.box, styles.preview]}>
          <View style={[styles.previewRow, { backgroundColor: c.accentRow }]}>
            <View style={[styles.previewBadge, { backgroundColor: c.accent }]}>
              <Text style={[styles.previewBadgeText, { color: c.onAccent }]}>1</Text>
            </View>
            <Text style={[styles.previewValue, { color: c.text }]}>100 × 8</Text>
            <View style={[styles.previewCheck, { backgroundColor: c.accent }]}>
              <Icon name="check" size={16} color={c.onAccent} />
            </View>
          </View>
          <View style={[styles.previewButton, { backgroundColor: c.accent }]}>
            <Icon name="add" size={18} color={c.onAccent} />
            <Text style={[styles.previewButtonText, { color: c.onAccent }]}>Add moves</Text>
          </View>
        </View>
      </Section>

      <Text style={[settingsStyles.footnote, { color: c.textFaint }]}>
        Muscle group colours stay the same. The app icon keeps its lime green.
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  modeItem: { paddingHorizontal: 12, height: 32, borderRadius: 6, justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  swatchItem: { width: '25%', alignItems: 'center', gap: 6 },
  swatchRing: { padding: 3, borderRadius: 30, borderWidth: 2 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  swatchName: { fontSize: 12, fontWeight: '700' },
  preview: { gap: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.sm },
  previewBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewBadgeText: { fontSize: 13, fontWeight: '700' },
  previewValue: { flex: 1, fontSize: 18, fontWeight: '700' },
  previewCheck: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
  },
  previewButtonText: { fontSize: 16, fontWeight: '700' },
});
