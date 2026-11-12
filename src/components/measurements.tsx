import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { Chip, IconButton } from '@/components/ui';
import { todayKey } from '@/lib/dates';
import type { Range } from '@/lib/progress';
import { fmt } from '@/lib/stats';
import { useStore } from '@/store/store';
import { useColors } from '@/theme';

/** Body measurements: tape measurements in cm (inches with lb), and body fat in %. */
export const MEASURES: { id: string; name: string; percent?: boolean }[] = [
  { id: 'waist', name: 'Waist' },
  { id: 'chest', name: 'Chest' },
  { id: 'hips', name: 'Hips' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'arms', name: 'Arms' },
  { id: 'forearms', name: 'Forearms' },
  { id: 'thighs', name: 'Thighs' },
  { id: 'calves', name: 'Calves' },
  { id: 'neck', name: 'Neck' },
  { id: 'bodyfat', name: 'Body fat', percent: true },
];

/** The latest value of a measurement on or before `date`. */
function latestOn(all: Record<string, Record<string, number>>, key: string, date: string): number | null {
  let best: string | null = null;
  for (const d of Object.keys(all)) if (all[d][key] != null && d <= date && (!best || d > best)) best = d;
  return best ? all[best][key] : null;
}

/** Pick a measurement, log today's value, and see it over the period. */
export function Measurements({ range, dateLabel }: { range: Range; dateLabel: (d: string) => string }) {
  const c = useColors();
  const unit = useStore((s) => s.settings.unit);
  const all = useStore((s) => s.measurements);
  const selected = useStore((s) => s.settings.measure) ?? 'waist';
  const setMeasurement = useStore((s) => s.setMeasurement);
  const setSettingsFlags = useStore((s) => s.setSettingsFlags);
  const today = todayKey();
  const m = MEASURES.find((x) => x.id === selected) ?? MEASURES[0];
  const suffix = m.percent ? '%' : unit === 'kg' ? 'cm' : 'in';
  const step = m.percent ? 0.1 : unit === 'kg' ? 0.5 : 0.25;
  const latest = latestOn(all, m.id, today);
  const points = Object.keys(all)
    .filter((d) => d >= range.from && d <= range.to && all[d][m.id] != null)
    .sort()
    .map((d) => ({ date: d, value: all[d][m.id] }));
  const change = points.length > 1 ? points[points.length - 1].value - points[0].value : null;
  const format = (v: number) => `${fmt(Math.round(v * 10) / 10)} ${suffix}`;
  // Latest value of every measurement that has one, for a quick overview.
  const summary = MEASURES.map((x) => ({ x, v: latestOn(all, x.id, today) })).filter((r) => r.v != null);

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.wrapChips}>
        {MEASURES.map((x) => (
          <Chip
            key={x.id}
            label={x.name}
            selected={x.id === m.id}
            onPress={() => setSettingsFlags({ measure: x.id })}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: c.text }]}>{m.name} today</Text>
        <Stepper
          style={{ width: 160 }}
          value={all[today]?.[m.id] ?? null}
          decimal
          placeholder={latest != null ? fmt(latest) : '0'}
          label={m.name.toLowerCase()}
          onChange={(v) => setMeasurement(today, m.id, v)}
          onStep={(dir) => {
            const base = all[today]?.[m.id] ?? latest ?? 0;
            setMeasurement(today, m.id, Math.max(0, Math.round((base + dir * step) * 100) / 100));
          }}
        />
        {all[today]?.[m.id] != null ? (
          <IconButton
            name="delete"
            size={20}
            color={c.textFaint}
            label={`Delete today's ${m.name.toLowerCase()}`}
            onPress={() => setMeasurement(today, m.id, null)}
          />
        ) : null}
      </View>

      {points.length ? (
        <>
          {change != null ? (
            <Text style={[styles.note, { color: c.textDim }]}>
              {change > 0 ? '▲' : change < 0 ? '▼' : ''} {format(Math.abs(change))}{' '}
              {range.title === 'All time' ? 'overall' : 'this period'}
            </Text>
          ) : null}
          <LineChart
            key={`${m.id}-${range.from}`}
            points={points}
            from={points.length > 1 ? points[0].date : range.from}
            to={points.length > 1 ? points[points.length - 1].date : range.to}
            format={format}
            dateLabel={dateLabel}
          />
        </>
      ) : (
        <Text style={[styles.note, { color: c.textFaint, textAlign: 'center', paddingVertical: 8 }]}>
          No {m.name.toLowerCase()} logged in this period.
        </Text>
      )}

      {summary.length ? (
        <View style={[styles.summary, { borderTopColor: c.border }]}>
          {summary.map(({ x, v }) => (
            <View key={x.id} style={styles.summaryItem}>
              <Text style={[styles.summaryName, { color: c.textDim }]}>{x.name}</Text>
              <Text style={[styles.summaryValue, { color: c.text }]}>
                {fmt(v!)} {x.percent ? '%' : unit === 'kg' ? 'cm' : 'in'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8 },
  // Chip rows wrap onto more lines (a sideways scroller would fight the page swipe).
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  summaryItem: { width: '33.33%', paddingVertical: 4 },
  summaryName: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 15, fontWeight: '800' },
});
