import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { addDays, fromKey, todayKey } from '@/lib/dates';
import { weekStart } from '@/lib/progress';
import { isCounted } from '@/lib/stats';
import type { Entry } from '@/store/store';
import { useColors } from '@/theme';

const WEEKS = 26;
const GAP = 3;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Shade for 0, a light day, a medium day, a big day, a huge day (by sets). */
const LEVELS = [0, 0.3, 0.55, 0.8, 1];

function level(sets: number) {
  if (!sets) return 0;
  if (sets < 10) return 1;
  if (sets < 20) return 2;
  if (sets < 30) return 3;
  return 4;
}

/**
 * The last six months, one square per day (weeks as columns, Monday at the top), shaded by
 * how many sets were done that day.
 */
export function TrainingHeatmap({ days }: { days: Record<string, Entry[]> }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const today = todayKey();
  const first = addDays(weekStart(today), -(WEEKS - 1) * 7);
  const cell = width ? Math.floor((width - GAP * (WEEKS - 1)) / WEEKS) : 0;

  const setsOn = (d: string) => (days[d] ?? []).reduce((n, e) => n + e.sets.filter(isCounted).length, 0);
  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(first, w * 7 + i);
      const sets = d > today ? -1 : setsOn(d);
      return { d, sets };
    }),
  );
  const workouts = columns.flat().filter((x) => x.sets > 0).length;
  // A month's name over the first week that starts in it.
  const monthLabels = columns.map((col, w) => {
    const m = fromKey(col[0].d).getMonth();
    const prev = w > 0 ? fromKey(columns[w - 1][0].d).getMonth() : -1;
    return m !== prev ? MONTHS[m] : '';
  });

  return (
    <View style={{ gap: 6 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {cell > 0 ? (
        <>
          <View style={[styles.months, { height: 14 }]}>
            {monthLabels.map((m, w) =>
              m ? (
                <Text key={w} style={[styles.month, { color: c.textDim, left: w * (cell + GAP) }]}>
                  {m}
                </Text>
              ) : null,
            )}
          </View>
          <View style={styles.grid}>
            {columns.map((col, w) => (
              <View key={w} style={{ gap: GAP }}>
                {col.map(({ d, sets }) => (
                  <View
                    key={d}
                    style={{
                      width: cell,
                      height: cell,
                      borderRadius: Math.max(2, cell / 4),
                      backgroundColor: sets > 0 ? c.accent : c.surface2,
                      opacity: sets < 0 ? 0 : sets > 0 ? LEVELS[level(sets)] : 1,
                      borderWidth: d === today ? 1.5 : 0,
                      borderColor: c.text,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={[styles.note, { color: c.textDim }]}>
              {workouts} {workouts === 1 ? 'workout' : 'workouts'} in 6 months
            </Text>
            <View style={styles.legend}>
              <Text style={[styles.note, { color: c.textFaint }]}>Less</Text>
              {LEVELS.map((o, i) => (
                <View
                  key={i}
                  style={[styles.legendCell, { backgroundColor: i ? c.accent : c.surface2, opacity: i ? o : 1 }]}
                />
              ))}
              <Text style={[styles.note, { color: c.textFaint }]}>More</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  months: { position: 'relative' },
  month: { position: 'absolute', top: 0, fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: GAP },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
  note: { fontSize: 12, fontWeight: '600' },
});
