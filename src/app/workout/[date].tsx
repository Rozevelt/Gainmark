import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatTile } from '@/components/charts';
import { DonutChart } from '@/components/donut';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { IconButton, ScreenHeader } from '@/components/ui';
import { formatMinutes } from '@/components/workout-timer';
import { longLabel } from '@/lib/dates';
import { compact, dayTotals, groupBreakdown, type ShareBy } from '@/lib/progress';
import { bestScored, bestSetBefore, fmt, isCounted, NOMINAL_BODYWEIGHT } from '@/lib/stats';
import { bodyweightOn, formatSet, useExercises, useGroups, useSortedDates, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/** One workout, analysed: totals, PRs and how it was split across muscle groups. */
export default function WorkoutAnalysisScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const days = useStore((s) => s.days);
  const session = useStore((s) => s.sessions[date]);
  const unit = useStore((s) => s.settings.unit);
  const sortedDates = useSortedDates();
  const { byId } = useExercises();
  const { groupById } = useGroups();
  const [by, setBy] = useState<ShareBy>('sets');

  const entries = days[date] ?? [];
  const totals = dayTotals(entries, session);
  const share = groupBreakdown(days, date, date, byId, groupById, by);
  const bodyweights = useStore((s) => s.bodyweights);
  const bw = bodyweightOn(bodyweights, date) ?? NOMINAL_BODYWEIGHT[unit];
  const kindOf = (exerciseId: string) => byId.get(exerciseId)?.kind ?? 'weight';
  const prs = entries.filter((e) => {
    const kind = kindOf(e.exerciseId);
    const top = bestScored(e.sets, kind, bw).value;
    return top > 0 && top > bestSetBefore(days, sortedDates, e.exerciseId, date, kind, bw);
  }).length;
  const format = by === 'sets' ? (v: number) => `${fmt(v)} ${v === 1 ? 'set' : 'sets'}` : (v: number) => `${compact(v)} ${unit}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Workout summary"
        subtitle={date ? longLabel(date) : undefined}
        left={<IconButton name="back" label="Back" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {entries.length === 0 ? (
          <Text style={[styles.note, { color: c.textDim, textAlign: 'center' }]}>Nothing logged on this day.</Text>
        ) : (
          <>
            <View style={styles.tiles}>
              <StatTile label="Moves" value={fmt(entries.length)} />
              <StatTile label="Sets" value={fmt(totals.sets)} sub={`${fmt(totals.reps)} reps`} />
              <StatTile label="Volume" value={`${compact(totals.volume)} ${unit}`} />
              <StatTile
                label="Time"
                value={session?.logged && session.end ? formatMinutes(session.end - session.start) : '—'}
                sub={prs ? `🏆 ${prs} new ${prs === 1 ? 'PR' : 'PRs'}` : undefined}
              />
            </View>

            <Card
              title="MUSCLE GROUPS"
              right={
                <View style={[styles.segment, { backgroundColor: c.surface2 }]}>
                  {(['sets', 'volume'] as ShareBy[]).map((b) => (
                    <Pressable
                      key={b}
                      onPress={() => setBy(b)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: by === b }}
                      style={[styles.segmentItem, by === b && { backgroundColor: c.accent }]}>
                      <Text style={[styles.segmentText, { color: by === b ? c.onAccent : c.text }]}>
                        {b === 'sets' ? 'By sets' : 'By volume'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              }>
              {share.length ? (
                <DonutChart
                  key={by}
                  slices={share.map((s) => ({ id: s.group.id, label: s.group.name, color: s.group.color, value: s.value }))}
                  format={format}
                  totalLabel={by === 'sets' ? 'total' : 'total volume'}
                />
              ) : (
                <Text style={[styles.note, { color: c.textFaint }]}>
                  {by === 'volume' ? 'No weighted sets to compare.' : 'No sets with reps logged.'}
                </Text>
              )}
            </Card>

            <Card title="MOVES">
              {entries.map((e, i) => {
                const ex = byId.get(e.exerciseId);
                const group = ex ? groupById.get(ex.group) : undefined;
                const done = e.sets.filter(isCounted);
                const top = bestScored(done, kindOf(e.exerciseId), bw);
                const vol = done.reduce((n, s) => n + Math.max(0, s.weight ?? 0) * (s.reps ?? 0), 0);
                return (
                  <View
                    key={e.id}
                    style={[styles.moveRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                    <View style={[styles.dot, { backgroundColor: group?.color ?? c.textFaint }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moveName, { color: c.text }]}>{ex?.name ?? 'Deleted move'}</Text>
                      <Text style={[styles.moveMeta, { color: c.textDim }]}>
                        {done.length} {done.length === 1 ? 'set' : 'sets'}
                        {top.set ? `  ·  best ${formatSet(top.set, unit)}` : ''}
                        {vol ? `  ·  ${compact(vol)} ${unit}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push({ pathname: '/move/[id]', params: { id: e.exerciseId } })}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${ex?.name ?? 'Move'} details`}>
                      <Icon name="right" size={18} color={c.textFaint} />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.cardTitleRow}>
        <Text style={[styles.sectionTitle, { color: c.textDim }]}>{title}</Text>
        {right}
      </View>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 4 },
  segment: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  segmentItem: { paddingHorizontal: 12, height: 28, borderRadius: radius.pill, justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  moveName: { fontSize: 15, fontWeight: '700' },
  moveMeta: { fontSize: 13, marginTop: 1 },
  note: { fontSize: 13, lineHeight: 18 },
});
