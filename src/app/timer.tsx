import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RestTimerBar } from '@/components/rest-timer-bar';
import { Stepper, tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { Button, Chip, IconButton, ScreenHeader } from '@/components/ui';
import { DEFAULT_REST, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

const PRESETS = [30, 45, 60, 90, 120, 180, 300];

function label(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}

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
        <View style={styles.chips}>
          {PRESETS.map((p) => (
            <Chip key={p} label={label(p)} selected={false} onPress={() => start(p)} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: c.textDim, marginTop: 12 }]}>CUSTOM (SECONDS)</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.big, { color: c.text }]}>{label(seconds ?? 0)}</Text>
          <Stepper
            value={seconds}
            label="seconds"
            height={48}
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

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 12 },
  big: { fontSize: 36, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  note: { fontSize: 13, textAlign: 'center' },
});
