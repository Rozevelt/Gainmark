import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RestTimerBar } from '@/components/rest-timer-bar';
import { Stepper, tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { Button, IconButton, ScreenHeader } from '@/components/ui';
import { DEFAULT_REST, formatClock, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/** Quick start times: 30 s to 5 min. */
const PRESETS = [30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300];
/** Tiles per row in the quick start grid. */
const COLUMNS = 4;

/** A general countdown timer with quick presets. */
export default function TimerScreen() {
  const c = useColors();
  const defaultRest = useStore((s) => (s.settings.rest ?? DEFAULT_REST).seconds);
  const startCountdown = useStore((s) => s.startCountdown);
  const running = useStore((s) => !!s.countdown);
  const [seconds, setSeconds] = useState<number | null>(defaultRest);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const start = (secs: number) => {
    if (secs < 1) return;
    tick('light');
    startCountdown(secs, 'Timer', 'timer');
    close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Timer"
        subtitle="Counts down at the bottom of the screen"
        left={<IconButton name="close" label="Close" onPress={close} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: c.textDim }]}>QUICK START</Text>
        {/* Equal tiles in a grid; tap one to start straight away. */}
        <View style={styles.grid}>
          {PRESETS.map((p) => (
            <View key={p} style={styles.cell}>
              <Pressable
                onPress={() => start(p)}
                accessibilityRole="button"
                accessibilityLabel={`Start a ${formatClock(p)} timer`}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: pressed ? c.accentSoft : c.surface, borderColor: pressed ? c.accent : c.border },
                ]}>
                <Text style={[styles.tileTime, { color: c.text }]}>{formatClock(p)}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: c.textDim, marginTop: 14 }]}>CUSTOM</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* ±15 s per tap; type "90" or "1:30". */}
          <Stepper
            value={seconds}
            mode="seconds"
            label="time"
            height={56}
            onChange={setSeconds}
            onStep={(d) => setSeconds((v) => Math.max(5, (v ?? 0) + d * 15))}
          />
          <Button title="Start timer" icon="play" onPress={() => start(seconds ?? 0)} disabled={!seconds} />
        </View>
        {running ? (
          <Text style={[styles.note, { color: c.textFaint }]}>Starting a new timer replaces the one running.</Text>
        ) : null}
      </ScrollView>
      <RestTimerBar />
    </View>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -GAP / 2, rowGap: GAP },
  cell: { width: `${100 / COLUMNS}%`, paddingHorizontal: GAP / 2 },
  tile: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTime: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 12 },
  note: { fontSize: 13, textAlign: 'center' },
});
