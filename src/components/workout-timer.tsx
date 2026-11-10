import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { confirmAction } from '@/lib/confirm';
import { todayKey } from '@/lib/dates';
import { DEFAULT_TIMER, useStore } from '@/store/store';
import { useColors } from '@/theme';

/** 754 s → "12:34", 3754 s → "1:02:34". */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** "54 min" / "1 h 12 min", for summaries. */
export function formatMinutes(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/**
 * Workout timer for one day, as text-and-icon buttons with no backgrounds: Start workout,
 * the running time with a stop button, and the finished / logged time.
 * Hidden when the timer is off in Settings, on days without moves (until timed), and on
 * other days unless a workout was timed there.
 */
export function WorkoutTimer({ date, hasMoves }: { date: string; hasMoves: boolean }) {
  const c = useColors();
  const enabled = useStore((s) => (s.settings.timer ?? DEFAULT_TIMER).enabled);
  const session = useStore((s) => s.sessions[date]);
  const startWorkout = useStore((s) => s.startWorkout);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const resumeWorkout = useStore((s) => s.resumeWorkout);
  const resetWorkout = useStore((s) => s.resetWorkout);
  const logWorkout = useStore((s) => s.logWorkout);
  const running = !!session && !session.end;
  const isToday = date === todayKey();

  // Tick once a second while running.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!enabled) return null;
  if (!session && (!isToday || !hasMoves)) return null;

  if (!session) {
    return (
      <View style={styles.line}>
        <TextButton icon="play" label="Start workout" color={c.accent} onPress={() => startWorkout(date)} />
      </View>
    );
  }

  const elapsed = (session.end ?? Math.max(now, session.start)) - session.start;
  const logged = !!session.logged;

  if (running) {
    // A small floating capsule: it stays pinned while you scroll, so it has its own
    // background to stay readable over the cards.
    return (
      <View style={[styles.line, styles.capsule, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Icon name="timer" size={17} color={c.accent} />
        <Text style={[styles.time, styles.timeBig, { color: c.accent }]}>{formatDuration(elapsed)}</Text>
        <TextButton icon="stop" label="Finish workout" color={c.textDim} onPress={() => finishWorkout(date)} iconOnly />
      </View>
    );
  }

  return (
    <Pressable
      // A logged time stays on the day; long-press to remove it.
      onLongPress={
        logged
          ? () => confirmAction('Delete workout time?', 'Remove the logged time for this day?', 'Delete', () => resetWorkout(date))
          : undefined
      }
      accessibilityHint={logged ? 'Long-press to delete the logged time' : undefined}
      style={styles.line}>
      <Icon name="timer" size={16} color={logged ? c.accent : c.textDim} />
      <Text style={[styles.time, { color: c.text }]}>{formatDuration(elapsed)}</Text>
      {logged ? (
        <Icon name="check" size={16} color={c.accent} />
      ) : (
        <>
          {isToday ? (
            <TextButton icon="play" label="Resume" color={c.textDim} onPress={() => resumeWorkout(date)} iconOnly />
          ) : null}
          <TextButton icon="delete" label="Delete time" color={c.textDim} onPress={() => resetWorkout(date)} iconOnly />
          <TextButton icon="check" label="Log" color={c.accent} onPress={() => logWorkout(date)} />
        </>
      )}
    </Pressable>
  );
}

/** A timer action drawn as just an icon (and label), with no background. */
function TextButton({
  icon,
  label,
  color,
  onPress,
  iconOnly,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  iconOnly?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tick('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}>
      <Icon name={icon} size={iconOnly ? 22 : 20} color={color} />
      {iconOnly ? null : <Text style={[styles.buttonText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // One compact row, the same height in every state.
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 36,
  },
  // Snug around the time and the stop button.
  capsule: {
    height: 36,
    paddingLeft: 10,
    paddingRight: 0,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  time: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], marginLeft: 3 },
  timeBig: { fontSize: 16 },
  // Big enough to hit easily: at least 36×36, plus extra touch margin (hitSlop).
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    minWidth: 36,
    paddingHorizontal: 6,
  },
  buttonText: { fontSize: 14, fontWeight: '800' },
});
