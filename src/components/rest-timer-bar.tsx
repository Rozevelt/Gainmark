import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { vibrateRestOver } from '@/lib/rest-alert';
import { useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/** Height of the bar, so screens can leave room for it. */
export const REST_BAR_HEIGHT = 76;

function mmss(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Countdown pinned to the bottom of the screen (rest between sets or the general timer).
 * Vibrates and shows "Rest over" for a moment when it reaches zero.
 */
export function RestTimerBar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const countdown = useStore((s) => s.countdown);
  const adjust = useStore((s) => s.adjustCountdown);
  const stop = useStore((s) => s.stopCountdown);
  const [now, setNow] = useState(() => Date.now());
  const buzzedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!countdown) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [countdown]);

  const remaining = countdown ? (countdown.endsAt - now) / 1000 : 0;
  const finished = !!countdown && remaining <= 0;

  // At zero: buzz once, show "Rest over" briefly, then hide.
  useEffect(() => {
    if (!countdown || !finished || buzzedFor.current === countdown.endsAt) return;
    buzzedFor.current = countdown.endsAt;
    vibrateRestOver();
    const id = setTimeout(stop, 4000);
    return () => clearTimeout(id);
  }, [countdown, finished, stop]);

  if (!countdown) return null;
  const progress = finished ? 1 : Math.min(1, Math.max(0, 1 - remaining / countdown.duration));

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          { backgroundColor: finished ? c.accent : c.surface2, borderColor: finished ? c.accent : c.border },
        ]}>
        {/* Fill grows as the rest runs down. */}
        {!finished ? (
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: c.accentSoft }]} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: finished ? c.onAccent : c.textDim }]} numberOfLines={1}>
            {countdown.kind === 'rest'
              ? finished
                ? 'Rest over — next set!'
                : `Rest${countdown.label ? ` · ${countdown.label}` : ''}`
              : finished
                ? "Time's up!"
                : 'Timer'}
          </Text>
          <Text style={[styles.time, { color: finished ? c.onAccent : c.text }]}>
            {finished ? '0:00' : mmss(remaining)}
          </Text>
        </View>
        {finished ? (
          <BarButton label="Done" onPress={stop} inverted />
        ) : (
          <>
            <BarButton label="−15" onPress={() => adjust(-15)} />
            <BarButton label="+15" onPress={() => adjust(15)} />
            <Pressable
              onPress={() => {
                tick('light');
                stop();
              }}
              accessibilityRole="button"
              accessibilityLabel="Skip rest"
              hitSlop={6}
              style={({ pressed }) => [styles.skip, { backgroundColor: c.accent, opacity: pressed ? 0.75 : 1 }]}>
              <Icon name="close" size={18} color={c.onAccent} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function BarButton({ label, onPress, inverted }: { label: string; onPress: () => void; inverted?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tick();
        onPress();
      }}
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: inverted ? c.onAccent : c.surface, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: inverted ? c.accent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: REST_BAR_HEIGHT - 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  button: { height: 40, minWidth: 48, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800' },
  skip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
