import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { IconButton } from '@/components/ui';
import type { Exercise } from '@/data/exercises';
import { confirmAction } from '@/lib/confirm';
import { fmt, plateMath, plateText, roundToStep } from '@/lib/stats';
import { useBar, useGroups, usePlates, useStore, useWarmupSteps, type Entry, type Unit } from '@/store/store';
import { radius, useColors } from '@/theme';

/**
 * Warm-up sets shown above a move when warm-ups are on for it. Each step is a percentage
 * of the move's top working weight that day (rounded to a loadable weight, never below
 * the bar), so they follow the working sets automatically.
 */
export function WarmupCard({
  date,
  entry,
  exercise,
  unit,
}: {
  date: string;
  entry: Entry;
  exercise: Exercise | undefined;
  unit: Unit;
}) {
  const c = useColors();
  const steps = useWarmupSteps();
  const bar = useBar(exercise);
  const plateSizes = usePlates();
  const { groupById } = useGroups();
  const group = exercise ? groupById.get(exercise.group) : undefined;
  const toggleWarmupDone = useStore((s) => s.toggleWarmupDone);
  const setExerciseWarmup = useStore((s) => s.setExerciseWarmup);
  const name = exercise?.name ?? 'Move';

  const top = Math.max(0, ...entry.sets.map((s) => s.weight ?? 0));
  const weightFor = (pct: number) => {
    if (!top) return null;
    if (pct >= 100) return top;
    return Math.max(bar ?? 0, roundToStep((top * pct) / 100, unit));
  };
  const allDone = steps.length > 0 && steps.every((_, i) => entry.warmupDone?.[i]);

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: allDone ? c.accent : c.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.text }]}>{name} warm-up</Text>
          <View style={styles.metaRow}>
            {group ? <View style={[styles.dot, { backgroundColor: group.color }]} /> : null}
            <Text style={[styles.meta, { color: c.textDim }]}>
              {top ? `Warm-up to ${fmt(top)} ${unit}` : 'Set a working weight below first'}
            </Text>
          </View>
        </View>
        <IconButton
          name="close"
          size={20}
          color={c.textFaint}
          label={`Turn off warm-up for ${name}`}
          onPress={() =>
            confirmAction(
              'Turn off warm-up?',
              `${name} will no longer get warm-up sets. You can turn it back on from the move's settings.`,
              'Turn off',
              () => setExerciseWarmup(entry.exerciseId, false),
            )
          }
        />
      </View>

      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.colSet, styles.th, { color: c.textFaint }]}>SET</Text>
        <Text style={[styles.colWeight, styles.th, { color: c.textFaint }]}>{unit.toUpperCase()}</Text>
        <Text style={[styles.colReps, styles.th, { color: c.textFaint }]}>REPS</Text>
        <View style={styles.colCheck}>
          <Icon name="check" size={16} color={c.textFaint} />
        </View>
      </View>

      {steps.map((step, i) => {
        const done = !!entry.warmupDone?.[i];
        const w = weightFor(step.pct);
        // Plates per side for this warm-up weight (for moves that use a bar).
        const plates = bar != null && w ? plateText(plateMath(w, bar, plateSizes), bar, unit) : null;
        return (
          <View key={i} style={[styles.setBlock, { backgroundColor: done ? c.accentRow : c.surface }]}>
            <View style={styles.row}>
              <View style={styles.colSet}>
                <View style={[styles.badge, { backgroundColor: done ? c.accent : c.surface2 }]}>
                  <Text style={[styles.badgeText, { color: done ? c.onAccent : c.textDim }]}>W{i + 1}</Text>
                </View>
              </View>
              <View style={[styles.colWeight, styles.box, { backgroundColor: c.surface2 }]}>
                <Text style={[styles.value, { color: w ? c.text : c.textFaint }]}>{w ? fmt(w) : '—'}</Text>
                <Text style={[styles.pct, { color: c.textFaint }]}>{step.pct}%</Text>
              </View>
              <View style={[styles.colReps, styles.box, { backgroundColor: c.surface2 }]}>
                <Text style={[styles.value, { color: c.text }]}>{step.reps}</Text>
              </View>
              <Pressable
                onPress={() => {
                  tick('light');
                  toggleWarmupDone(date, entry.id, i);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Warm-up set ${i + 1} done`}
                hitSlop={4}
                style={styles.colCheck}>
                <View
                  style={[
                    styles.check,
                    done
                      ? { backgroundColor: c.accent, borderColor: c.accent }
                      : { backgroundColor: c.surface2, borderColor: c.border },
                  ]}>
                  {done ? <Icon name="check" size={16} color={c.onAccent} /> : null}
                </View>
              </Pressable>
            </View>
            {plates ? (
              <Text style={[styles.plates, { color: c.textDim }]} numberOfLines={1}>
                {plates}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1.5, padding: 12, paddingTop: 10, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  name: { fontSize: 18, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { fontSize: 13, flexShrink: 1 },
  headRow: { paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  th: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },
  colSet: { width: 30, alignItems: 'center' },
  colWeight: { flex: 1.25 },
  colReps: { flex: 1 },
  colCheck: { width: 34, alignItems: 'center' },
  // Rows reach the card's edges (its 12px padding), like the move's own sets.
  setBlock: { marginHorizontal: -12, paddingHorizontal: 18, paddingVertical: 5 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  box: {
    height: 44,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 11,
  },
  value: { fontSize: 18, fontWeight: '700' },
  pct: { fontSize: 11, fontWeight: '700' },
  plates: { fontSize: 12, lineHeight: 16, marginTop: 3, marginLeft: 38 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
