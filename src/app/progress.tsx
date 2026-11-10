import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, LineChart, StatTile } from '@/components/charts';
import { DonutChart } from '@/components/donut';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Chip, IconButton, ScreenHeader } from '@/components/ui';
import { fromKey, shortLabel, todayKey } from '@/lib/dates';
import {
  bucketValues,
  compact,
  dayTotals,
  goalStatus,
  groupBreakdown,
  moveSeries,
  movesInRange,
  periodRange,
  rangeTotals,
  type Metric,
  type MoveMetric,
  type Period,
  type Range,
  type ShareBy,
} from '@/lib/progress';
import { useProgressMove } from '@/lib/progress-pick';
import { fmt } from '@/lib/stats';
import { dayGroups } from '@/lib/summary';
import { bodyweightOn, formatClock, useExercises, useGoal, useGroups, useSortedDates, useStore } from '@/store/store';
import { Stepper } from '@/components/stepper';
import { confirmAction } from '@/lib/confirm';
import { radius, useColors } from '@/theme';

type Tab = 'overview' | 'trends' | 'muscles' | 'moves' | 'body';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'moves', label: 'Moves' },
  { id: 'body', label: 'Body' },
];

const PERIOD_LABELS: Record<Period, string> = { all: 'All time', week: 'Week', month: 'Month', year: 'Year' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (key: string) => {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

function minutes(m: number) {
  const r = Math.round(m);
  return r < 60 ? `${r} min` : `${Math.floor(r / 60)} h ${r % 60} min`;
}

/** "▲ 12% vs previous" comparison with the period before. */
function change(now: number, before: number) {
  if (!before && !now) return undefined;
  if (!before) return 'New this period';
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs previous`;
}

export default function ProgressScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<Period>('all');
  const [offset, setOffset] = useState(0);
  // All time starts at the first logged day.
  const first = useSortedDates()[0];
  const range = useMemo(() => periodRange(period, offset, first), [period, offset, first]);
  const prev = useMemo(() => (period === 'all' ? null : periodRange(period, offset + 1)), [period, offset]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="Progress" left={<IconButton name="back" label="Back" onPress={() => router.back()} />} />

      {/* Tabs, then one row of period controls shared by every tab. */}
      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            style={styles.tab}>
            <Text style={[styles.tabText, { color: tab === t.id ? c.text : c.textDim }]}>{t.label}</Text>
            <View style={[styles.tabLine, { backgroundColor: tab === t.id ? c.accent : 'transparent' }]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.periodBar}>
        <View style={[styles.segment, { backgroundColor: c.surface2 }]}>
          {(['all', 'week', 'month', 'year'] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => {
                setPeriod(p);
                setOffset(0);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: period === p }}
              style={[styles.segmentItem, period === p && { backgroundColor: c.accent }]}>
              <Text style={[styles.segmentText, { color: period === p ? c.onAccent : c.text }]}>
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* All time has nothing to step through, so its arrows are hidden (the row keeps its height). */}
        <View style={styles.periodNav}>
          <View style={{ opacity: period === 'all' ? 0 : 1 }} pointerEvents={period === 'all' ? 'none' : 'auto'}>
            <IconButton name="left" size={26} label="Previous period" onPress={() => setOffset((o) => o + 1)} />
          </View>
          <Text style={[styles.periodTitle, { color: c.text }]}>{range.title}</Text>
          <View
            style={{ opacity: period === 'all' ? 0 : offset === 0 ? 0.25 : 1 }}
            pointerEvents={period === 'all' ? 'none' : 'auto'}>
            <IconButton
              name="right"
              size={26}
              label="Next period"
              onPress={() => setOffset((o) => Math.max(0, o - 1))}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {tab === 'overview' ? <Overview range={range} prev={prev} /> : null}
        {tab === 'trends' ? <Trends range={range} prev={prev} /> : null}
        {tab === 'muscles' ? <Muscles range={range} prev={prev} /> : null}
        {tab === 'moves' ? <Moves range={range} prev={prev} /> : null}
        {tab === 'body' ? <Body range={range} prev={prev} /> : null}
      </ScrollView>
    </View>
  );
}

/** The period being viewed, and the one before it (none for All time). */
type TabProps = { range: Range; prev: Range | null };

// ---------- Overview: headline numbers and the period's workouts ----------

function Overview({ range, prev }: TabProps) {
  const c = useColors();
  const days = useStore((s) => s.days);
  const sessions = useStore((s) => s.sessions);
  const unit = useStore((s) => s.settings.unit);
  const { byId } = useExercises();
  const { groupById } = useGroups();
  const totals = rangeTotals(days, sessions, range.from, range.to);
  // No comparison for All time.
  const before = prev ? rangeTotals(days, sessions, prev.from, prev.to) : null;
  const timed = Object.entries(sessions).filter(([d, s]) => d >= range.from && d <= range.to && s.logged && s.end);
  const workouts = Object.keys(days)
    .filter((d) => d >= range.from && d <= range.to && dayTotals(days[d], undefined).sets > 0)
    .sort()
    .reverse();

  return (
    <>
      <GoalCard />
      <View style={styles.tiles}>
        <StatTile
          label="Workouts"
          value={fmt(totals.workouts)}
          sub={before ? change(totals.workouts, before.workouts) : undefined}
        />
        <StatTile
          label="Volume"
          value={`${compact(totals.volume)} ${unit}`}
          sub={before ? change(totals.volume, before.volume) : undefined}
        />
        <StatTile label="Sets" value={fmt(totals.sets)} sub={before ? change(totals.sets, before.sets) : undefined} />
        <StatTile
          label="Avg workout time"
          value={timed.length ? minutes(totals.time / timed.length) : '—'}
          sub={timed.length ? `${minutes(totals.time)} logged` : 'Log a workout time to see it'}
        />
      </View>

      <Card title="WORKOUTS">
        {workouts.length ? (
          workouts.map((d, i) => {
            const t = dayTotals(days[d], sessions[d]);
            const groups = dayGroups(days[d], byId, groupById);
            return (
              <Pressable
                key={d}
                onPress={() => router.push({ pathname: '/workout/[date]', params: { date: d } })}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.workoutRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  pressed && { backgroundColor: c.surface2 },
                ]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.workoutTitle, { color: c.text }]}>{shortLabel(d)}</Text>
                  <View style={styles.groupLine}>
                    {groups.map((g) => (
                      <View key={g.id} style={[styles.dot, { backgroundColor: g.color }]} />
                    ))}
                    <Text style={[styles.workoutMeta, { color: c.textDim }]} numberOfLines={1}>
                      {groups.map((g) => g.name).join(' · ')}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.workoutStat, { color: c.text }]}>{fmt(t.sets)} sets</Text>
                  <Text style={[styles.workoutMeta, { color: c.textDim }]}>
                    {t.time ? minutes(t.time) : `${compact(t.volume)} ${unit}`}
                  </Text>
                </View>
                <Icon name="right" size={18} color={c.textFaint} />
              </Pressable>
            );
          })
        ) : (
          <Empty
            text={prev ? 'No workouts in this period. Use the arrows to look further back.' : 'No workouts logged yet.'}
          />
        )}
      </Card>
    </>
  );
}

// ---------- Trends: one metric over the period ----------

function Trends({ range }: TabProps) {
  const days = useStore((s) => s.days);
  const sessions = useStore((s) => s.sessions);
  const unit = useStore((s) => s.settings.unit);
  const [metric, setMetric] = useState<Metric>('volume');
  const values = bucketValues(days, sessions, range, metric);
  const METRICS: { id: Metric; label: string; format: (v: number) => string }[] = [
    { id: 'volume', label: 'Volume', format: (v) => `${compact(v)} ${unit}` },
    { id: 'reps', label: 'Reps', format: (v) => fmt(v) },
    { id: 'sets', label: 'Sets', format: (v) => fmt(v) },
    { id: 'workouts', label: 'Workouts', format: (v) => fmt(v) },
    { id: 'time', label: 'Time', format: minutes },
  ];
  const m = METRICS.find((x) => x.id === metric)!;

  return (
    <Card title="TRENDS">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {METRICS.map((x) => (
          <Chip key={x.id} label={x.label} selected={metric === x.id} onPress={() => setMetric(x.id)} />
        ))}
      </ScrollView>
      <BarChart
        data={range.buckets.map((b, i) => ({ ...b, value: values[i] }))}
        format={m.format}
        totalLabel={`${m.label} · ${range.title}`}
      />
      <Text style={[styles.note, { color: useColors().textFaint }]}>Tap a bar to see that day or month.</Text>
    </Card>
  );
}

// ---------- Muscles: share of the period per muscle group ----------

function Muscles({ range }: TabProps) {
  const c = useColors();
  const days = useStore((s) => s.days);
  const unit = useStore((s) => s.settings.unit);
  const { byId } = useExercises();
  const { groupById } = useGroups();
  const [by, setBy] = useState<ShareBy>('sets');
  const share = groupBreakdown(days, range.from, range.to, byId, groupById, by);
  const format =
    by === 'sets' ? (v: number) => `${fmt(v)} ${v === 1 ? 'set' : 'sets'}` : (v: number) => `${compact(v)} ${unit}`;

  return (
    <Card
      title="MUSCLE GROUPS"
      right={
        <View style={[styles.miniSegment, { backgroundColor: c.surface2 }]}>
          {(['sets', 'volume'] as ShareBy[]).map((b) => (
            <Pressable
              key={b}
              onPress={() => setBy(b)}
              accessibilityRole="button"
              accessibilityState={{ selected: by === b }}
              style={[styles.miniItem, by === b && { backgroundColor: c.accent }]}>
              <Text style={[styles.miniText, { color: by === b ? c.onAccent : c.text }]}>
                {b === 'sets' ? 'By sets' : 'By volume'}
              </Text>
            </Pressable>
          ))}
        </View>
      }>
      {share.length ? (
        <DonutChart
          key={`${by}-${range.from}`}
          slices={share.map((s) => ({ id: s.group.id, label: s.group.name, color: s.group.color, value: s.value }))}
          format={format}
          totalLabel={by === 'sets' ? 'total' : 'total volume'}
        />
      ) : (
        <Empty text="No sets logged in this period." />
      )}
    </Card>
  );
}

// ---------- Moves: one move over time ----------

function Moves({ range }: TabProps) {
  const c = useColors();
  const days = useStore((s) => s.days);
  const unit = useStore((s) => s.settings.unit);
  const { byId } = useExercises();
  const { groupById } = useGroups();
  const moveId = useProgressMove((s) => s.moveId);
  const [moveMetric, setMoveMetric] = useState<MoveMetric>('weight');
  const moves = movesInRange(days, range.from, range.to);
  const active = moveId && moves.some((m) => m.id === moveId) ? moveId : (moves[0]?.id ?? null);
  const activeEx = active ? byId.get(active) : undefined;
  const activeGroup = activeEx ? groupById.get(activeEx.group) : undefined;
  const kind = activeEx?.kind ?? 'weight';
  const dist = unit === 'kg' ? 'km' : 'mi';
  // What can be charted depends on how the move is logged; the first is the default.
  const METRICS: { id: MoveMetric; label: string; format: (v: number) => string }[] =
    kind === 'bodyweight'
      ? [
          { id: 'bestReps', label: 'Most reps', format: (v) => `${fmt(v)} reps` },
          { id: 'reps', label: 'Total reps', format: (v) => fmt(v) },
          { id: 'weight', label: 'Added weight', format: (v) => `${fmt(v)} ${unit}` },
        ]
      : kind === 'time'
        ? [
            { id: 'longest', label: 'Longest hold', format: formatClock },
            { id: 'duration', label: 'Total time', format: formatClock },
          ]
        : kind === 'cardio'
          ? [
              { id: 'distance', label: 'Distance', format: (v) => `${fmt(Math.round(v * 100) / 100)} ${dist}` },
              { id: 'duration', label: 'Time', format: formatClock },
            ]
          : [
              { id: 'weight', label: 'Top weight', format: (v) => `${fmt(v)} ${unit}` },
              { id: 'oneRM', label: 'Est. 1RM', format: (v) => `${fmt(Math.round(v * 10) / 10)} ${unit}` },
              { id: 'bestSet', label: 'Best set', format: (v) => `${fmt(v)} ${unit}` },
              { id: 'volume', label: 'Volume', format: (v) => `${compact(v)} ${unit}` },
              { id: 'reps', label: 'Reps', format: (v) => fmt(v) },
            ];
  const metric = METRICS.some((x) => x.id === moveMetric) ? moveMetric : METRICS[0].id;
  const series = active ? moveSeries(days, active, range.from, range.to, metric) : [];
  const mm = METRICS.find((x) => x.id === metric)!;

  if (!moves.length) {
    return (
      <Card title="MOVE PROGRESS">
        <Empty text="No moves logged in this period." />
      </Card>
    );
  }

  return (
    <>
      {/* The move being charted; tap to pick another on its own screen. */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/pick-move',
            params: { from: range.from, to: range.to, label: range.title, current: active ?? '' },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Move: ${activeEx?.name ?? 'Deleted move'}. Tap to choose another`}
        style={({ pressed }) => [
          styles.movePicker,
          { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.border },
        ]}>
        <View style={[styles.moveDot, { backgroundColor: activeGroup?.color ?? c.textFaint }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.moveName, { color: c.text }]} numberOfLines={1}>
            {activeEx?.name ?? 'Deleted move'}
          </Text>
          <Text style={[styles.moveMeta, { color: c.textDim }]} numberOfLines={1}>
            {activeGroup ? `${activeGroup.name} · ` : ''}
            {moves.length} {moves.length === 1 ? 'move' : 'moves'} logged
          </Text>
        </View>
        <Text style={[styles.moveChange, { color: c.accent }]}>Change</Text>
        <Icon name="right" size={18} color={c.accent} />
      </Pressable>
      <Card title="PROGRESS">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {METRICS.map((x) => (
            <Chip key={x.id} label={x.label} selected={metric === x.id} onPress={() => setMoveMetric(x.id)} />
          ))}
        </ScrollView>
        <LineChart
          key={`${active}-${metric}-${range.from}`}
          points={series}
          // Span the days the move was done, so the trend isn't squeezed into a corner.
          from={series.length > 1 ? series[0].date : range.from}
          to={series.length > 1 ? series[series.length - 1].date : range.to}
          format={mm.format}
          dateLabel={shortDate}
        />
        <Text style={[styles.note, { color: c.textFaint }]}>
          {series.length < 2
            ? 'Log this move on more days to see a trend. Try Month or Year for a longer view.'
            : 'Tap the chart to read any day.'}
        </Text>
      </Card>
    </>
  );
}

// ---------- Weekly goal and streak ----------

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function GoalCard() {
  const c = useColors();
  const days = useStore((s) => s.days);
  const goal = useGoal();
  if (!goal) return null;
  const g = goalStatus(days, goal);
  const reached = g.thisWeek >= goal;
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <Card
      title="THIS WEEK"
      right={
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <Text style={[styles.cardLink, { color: c.textDim }]}>Goal: {goal} a week</Text>
        </Pressable>
      }>
      <View style={styles.goalTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.goalValue, { color: reached ? c.accent : c.text }]}>
            {g.thisWeek} / {goal}
          </Text>
          <Text style={[styles.note, { color: c.textDim }]}>
            {reached
              ? 'Goal reached this week'
              : `${goal - g.thisWeek} more ${goal - g.thisWeek === 1 ? 'workout' : 'workouts'} to reach your goal`}
          </Text>
        </View>
        <View style={[styles.streak, { backgroundColor: g.streak ? c.accentSoft : c.surface2 }]}>
          <Icon name="flame" size={20} color={g.streak ? c.accent : c.textFaint} />
          <View>
            <Text style={[styles.streakValue, { color: g.streak ? c.accent : c.textDim }]}>
              {g.streak} {g.streak === 1 ? 'week' : 'weeks'}
            </Text>
            <Text style={[styles.streakLabel, { color: c.textDim }]}>streak · best {g.best}</Text>
          </View>
        </View>
      </View>
      {/* Mon–Sun: filled on days you trained. */}
      <View style={styles.weekRow}>
        {WEEK_LETTERS.map((l, i) => (
          <View key={i} style={styles.weekDay}>
            <View
              style={[
                styles.weekDot,
                g.weekDays[i]
                  ? { backgroundColor: c.accent, borderColor: c.accent }
                  : { borderColor: i === todayIdx ? c.textDim : c.border },
              ]}>
              {g.weekDays[i] ? <Icon name="check" size={14} color={c.onAccent} /> : null}
            </View>
            <Text style={[styles.weekLetter, { color: i === todayIdx ? c.text : c.textFaint }]}>{l}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------- Body: body weight log ----------

function Body({ range }: TabProps) {
  const c = useColors();
  const unit = useStore((s) => s.settings.unit);
  const bodyweights = useStore((s) => s.bodyweights);
  const setBodyweight = useStore((s) => s.setBodyweight);
  const today = todayKey();
  const latest = bodyweightOn(bodyweights, today);
  const step = unit === 'kg' ? 0.1 : 0.2;
  const points = Object.keys(bodyweights)
    .filter((d) => d >= range.from && d <= range.to)
    .sort()
    .map((d) => ({ date: d, value: bodyweights[d] }));
  const history = Object.keys(bodyweights).sort().reverse().slice(0, 30);
  const change = points.length > 1 ? points[points.length - 1].value - points[0].value : null;
  const format = (v: number) => `${fmt(Math.round(v * 10) / 10)} ${unit}`;

  return (
    <>
      <Card title="TODAY">
        <View style={styles.bodyRow}>
          <Icon name="scale" size={24} color={c.accent} />
          <Text style={[styles.bodyLabel, { color: c.text }]}>Body weight</Text>
          <Stepper
            style={{ width: 160 }}
            value={bodyweights[today] ?? null}
            decimal
            placeholder={latest != null ? fmt(latest) : '0'}
            label="body weight"
            onChange={(v) => setBodyweight(today, v)}
            onStep={(dir) => {
              const base = bodyweights[today] ?? latest ?? (unit === 'kg' ? 75 : 165);
              setBodyweight(today, Math.max(0, Math.round((base + dir * step) * 10) / 10));
            }}
          />
        </View>
        <Text style={[styles.note, { color: c.textFaint }]}>
          Weigh yourself at the same time each day (e.g. in the morning) for a steady trend. Bodyweight moves use it for
          their PRs.
        </Text>
      </Card>

      <Card
        title="BODY WEIGHT"
        right={
          change != null ? (
            <Text style={[styles.cardLink, { color: c.textDim }]}>
              {change > 0 ? '▲' : change < 0 ? '▼' : ''} {format(Math.abs(change))}{' '}
              {range.title === 'All time' ? 'overall' : 'this period'}
            </Text>
          ) : undefined
        }>
        {points.length ? (
          <LineChart
            key={range.from}
            points={points}
            from={points.length > 1 ? points[0].date : range.from}
            to={points.length > 1 ? points[points.length - 1].date : range.to}
            format={format}
            dateLabel={shortDate}
          />
        ) : (
          <Empty text="No body weight logged in this period." />
        )}
      </Card>

      {history.length ? (
        <Card title="HISTORY">
          {history.map((d, i) => (
            <View
              key={d}
              style={[
                styles.historyRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
              ]}>
              <Text style={[styles.workoutTitle, { color: c.text, flex: 1 }]}>{shortLabel(d)}</Text>
              <Text style={[styles.workoutStat, { color: c.text }]}>{format(bodyweights[d])}</Text>
              <IconButton
                name="delete"
                size={18}
                color={c.textFaint}
                label={`Delete body weight for ${shortLabel(d)}`}
                onPress={() =>
                  confirmAction('Delete entry?', `Remove your body weight for ${shortLabel(d)}?`, 'Delete', () =>
                    setBodyweight(d, null),
                  )
                }
              />
            </View>
          ))}
        </Card>
      ) : null}
    </>
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

function Empty({ text }: { text: string }) {
  const c = useColors();
  return <Text style={[styles.note, { color: c.textFaint, paddingVertical: 12, textAlign: 'center' }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 6 },
  tabText: { fontSize: 15, fontWeight: '700', paddingBottom: 8 },
  tabLine: { height: 3, alignSelf: 'stretch', marginHorizontal: 12, borderRadius: 2 },
  periodBar: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodTitle: { fontSize: 17, fontWeight: '800' },
  content: { padding: 16, paddingTop: 4, gap: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 14 },
  chips: { gap: 8 },
  movePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moveDot: { width: 10, height: 10, borderRadius: 5 },
  moveName: { fontSize: 17, fontWeight: '800' },
  moveMeta: { fontSize: 13, marginTop: 2 },
  moveChange: { fontSize: 14, fontWeight: '800' },
  miniSegment: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  miniItem: { paddingHorizontal: 12, height: 28, borderRadius: radius.pill, justifyContent: 'center' },
  miniText: { fontSize: 13, fontWeight: '700' },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  workoutTitle: { fontSize: 15, fontWeight: '700' },
  groupLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  workoutMeta: { fontSize: 13, flexShrink: 1, marginLeft: 2 },
  workoutStat: { fontSize: 14, fontWeight: '800' },
  note: { fontSize: 13, lineHeight: 18 },
  cardLink: { fontSize: 12, fontWeight: '700' },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalValue: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  streakValue: { fontSize: 16, fontWeight: '800' },
  streakLabel: { fontSize: 11, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLetter: { fontSize: 12, fontWeight: '700' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bodyLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
