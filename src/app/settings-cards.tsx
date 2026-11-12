import { Pressable, StyleSheet, View } from 'react-native';

import { PillStepper, Row, Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { Toggle } from '@/components/toggle';
import { IconButton } from '@/components/ui';
import { DEFAULT_DISPLAY, DEFAULT_WARMUP, useStore, useWarmupSteps, type WarmupStep } from '@/store/store';
import { useColors } from '@/theme';

/** What move cards show, and the warm-up steps. */
export default function CardSettings() {
  const c = useColors();
  const display = useStore((s) => s.settings.display) ?? DEFAULT_DISPLAY;
  const setDisplaySettings = useStore((s) => s.setDisplaySettings);
  const warmup = useWarmupSteps();
  const setWarmupSteps = useStore((s) => s.setWarmupSteps);
  const changeStep = (i: number, patch: Partial<WarmupStep>) =>
    setWarmupSteps(warmup.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  return (
    <SettingsPage title="Move cards">
      <Section title="SHOW ON CARDS">
        <Row label="Estimated 1RM">
          <Toggle value={display.oneRM} onValueChange={(oneRM) => setDisplaySettings({ oneRM })} />
        </Row>
        <Row label="Plates per side" last>
          <Toggle value={display.plates} onValueChange={(plates) => setDisplaySettings({ plates })} />
        </Row>
      </Section>

      <Section title="WARM-UP STEPS">
        <View style={settingsStyles.box}>
          <Text style={[settingsStyles.note, { color: c.textDim }]}>
            Used for moves with warm-up on. Each step is a percent of your top working weight.
          </Text>
          {warmup.map((w, i) => (
            <View key={i} style={styles.warmRow}>
              <Text style={[styles.warmLabel, { color: c.textDim }]}>W{i + 1}</Text>
              <PillStepper
                compact
                value={`${w.pct}%`}
                onLess={() => changeStep(i, { pct: Math.max(5, w.pct - 5) })}
                onMore={() => changeStep(i, { pct: Math.min(100, w.pct + 5) })}
                lessLabel={`Lower step ${i + 1} percent`}
                moreLabel={`Raise step ${i + 1} percent`}
              />
              <PillStepper
                compact
                value={`×${w.reps}`}
                onLess={() => changeStep(i, { reps: Math.max(1, w.reps - 1) })}
                onMore={() => changeStep(i, { reps: Math.min(30, w.reps + 1) })}
                lessLabel={`Fewer step ${i + 1} reps`}
                moreLabel={`More step ${i + 1} reps`}
              />
              {warmup.length > 1 ? (
                <IconButton
                  name="delete"
                  size={18}
                  color={c.textFaint}
                  label={`Remove step ${i + 1}`}
                  onPress={() => setWarmupSteps(warmup.filter((_, j) => j !== i))}
                />
              ) : null}
            </View>
          ))}
          <View style={styles.warmActions}>
            {warmup.length < 6 ? (
              <Pressable
                onPress={() => {
                  const last = warmup[warmup.length - 1];
                  setWarmupSteps([...warmup, { pct: Math.min(100, (last?.pct ?? 40) + 10), reps: 1 }]);
                }}
                hitSlop={8}>
                <Text style={[styles.warmLink, { color: c.accent }]}>+ Add step</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setWarmupSteps(DEFAULT_WARMUP)} hitSlop={8}>
              <Text style={[styles.warmLink, { color: c.textDim }]}>Reset to default</Text>
            </Pressable>
          </View>
        </View>
      </Section>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warmLabel: { width: 26, fontSize: 13, fontWeight: '800' },
  warmActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  warmLink: { fontSize: 14, fontWeight: '700' },
});
