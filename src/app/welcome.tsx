import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PillStepper } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { DEFAULT_THEME, useGoal, useStore, type Unit } from '@/store/store';
import { ACCENTS, palette, radius, useColors, useIsDark } from '@/theme';

/** First launch: pick a unit, a weekly goal and a colour. Everything can be changed later. */
export default function WelcomeScreen() {
  const c = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const unit = useStore((s) => s.settings.unit);
  const setUnit = useStore((s) => s.setUnit);
  const goal = useGoal();
  const setGoal = useStore((s) => s.setGoal);
  const theme = useStore((s) => s.settings.theme) ?? DEFAULT_THEME;
  const setTheme = useStore((s) => s.setTheme);
  const setSettingsFlags = useStore((s) => s.setSettingsFlags);

  // Then a short tour of the app.
  const done = () => {
    setSettingsFlags({ onboarded: true });
    router.replace('/tutorial');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <Text style={[styles.title, { color: c.text }]}>Welcome to Gainmark</Text>
          <Text style={[styles.subtitle, { color: c.textDim }]}>
            A few settings before you start. You can change them later in Settings.
          </Text>
        </View>

        <Step number={1} title="Weight unit">
          <View style={[styles.segment, { backgroundColor: c.surface2 }]}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                accessibilityRole="button"
                accessibilityState={{ selected: unit === u }}
                style={[styles.segmentItem, unit === u && { backgroundColor: c.accent }]}>
                <Text style={[styles.segmentText, { color: unit === u ? c.onAccent : c.text }]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </Step>

        <Step number={2} title="Workouts a week" hint="Your goal, for the weekly streak">
          <PillStepper
            value={goal ? String(goal) : 'Off'}
            onLess={() => setGoal(goal - 1)}
            onMore={() => setGoal(goal + 1)}
            lessLabel="Fewer workouts a week"
            moreLabel="More workouts a week"
          />
        </Step>

        <Step number={3} title="Colour">
          <View style={styles.swatches}>
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
                  hitSlop={4}
                  style={[styles.swatchRing, { borderColor: on ? p.accent : 'transparent' }]}>
                  <View style={[styles.swatch, { backgroundColor: p.accent }]}>
                    {on ? <Icon name="check" size={16} color={p.onAccent} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Step>

        <Button title="Continue" icon="right" onPress={done} />
      </ScrollView>
    </View>
  );
}

function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={[styles.step, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNumber, { backgroundColor: c.accentSoft }]}>
          <Text style={[styles.stepNumberText, { color: c.accent }]}>{number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, { color: c.text }]}>{title}</Text>
          {hint ? <Text style={[styles.stepHint, { color: c.textDim }]}>{hint}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  hero: { alignItems: 'center', gap: 10, marginBottom: 12 },
  logo: { width: 84, height: 84, borderRadius: 20 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  step: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '800' },
  stepTitle: { fontSize: 17, fontWeight: '800' },
  stepHint: { fontSize: 13, marginTop: 1 },
  segment: { flexDirection: 'row', borderRadius: radius.sm, padding: 3, alignSelf: 'flex-start' },
  segmentItem: { paddingHorizontal: 22, height: 34, borderRadius: 6, justifyContent: 'center' },
  segmentText: { fontSize: 16, fontWeight: '700' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatchRing: { padding: 2, borderRadius: 22, borderWidth: 2 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  later: { fontSize: 13, textAlign: 'center', marginTop: 6 },
});
