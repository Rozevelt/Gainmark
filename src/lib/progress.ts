import type { Exercise, MoveKind } from '@/data/exercises';
import type { Group } from '@/data/groups';
import { addDays, fromKey, toKey, todayKey } from '@/lib/dates';
import { best1RM, bestScored, bestSet, isCounted, setTotalReps, setTotalVolume } from '@/lib/stats';
import type { Entry, Session, WorkoutSet } from '@/store/store';

type Days = Record<string, Entry[]>;

export type Period = 'week' | 'month' | 'year' | 'all';

export type Bucket = {
  label: string;
  /** Longer name for the tooltip, e.g. "Tue 4 Nov" or "March 2026". */
  title: string;
  from: string;
  to: string;
  isCurrent: boolean;
};

export type Range = { from: string; to: string; title: string; buckets: Bucket[] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayTitle(key: string) {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * The week / month / year `offset` periods back from now (0 = current), with its chart buckets.
 * 'all' runs from `first` (the first logged day) to today and ignores `offset`.
 */
export function periodRange(period: Period, offset: number, first?: string): Range {
  const today = todayKey();
  const now = fromKey(today);
  if (period === 'all') return allTimeRange(first && first < today ? first : today, today);
  if (period === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7;
    const from = addDays(today, -mondayOffset - offset * 7);
    const to = addDays(from, 6);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const key = addDays(from, i);
      return {
        label: WEEKDAYS[fromKey(key).getDay()][0],
        title: dayTitle(key),
        from: key,
        to: key,
        isCurrent: key === today,
      };
    });
    const f = fromKey(from);
    const t = fromKey(to);
    const title =
      offset === 0
        ? 'This week'
        : f.getMonth() === t.getMonth()
          ? `${f.getDate()}–${t.getDate()} ${MONTHS[t.getMonth()]}`
          : `${f.getDate()} ${MONTHS[f.getMonth()]} – ${t.getDate()} ${MONTHS[t.getMonth()]}`;
    return { from, to, title, buckets };
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const from = toKey(first);
    const to = addDays(from, days - 1);
    const buckets = Array.from({ length: days }, (_, i) => {
      const key = addDays(from, i);
      return { label: String(i + 1), title: dayTitle(key), from: key, to: key, isCurrent: key === today };
    });
    return { from, to, title: `${MONTHS_LONG[first.getMonth()]} ${first.getFullYear()}`, buckets };
  }
  const year = now.getFullYear() - offset;
  const buckets = Array.from({ length: 12 }, (_, m) => {
    const from = toKey(new Date(year, m, 1));
    const to = toKey(new Date(year, m + 1, 0));
    return {
      label: MONTHS[m][0],
      title: `${MONTHS_LONG[m]} ${year}`,
      from,
      to,
      isCurrent: offset === 0 && m === now.getMonth(),
    };
  });
  return { from: `${year}-01-01`, to: `${year}-12-31`, title: String(year), buckets };
}

/**
 * All time, with buckets sized to how long you've been logging: days within one month,
 * months up to three years, then years.
 */
function allTimeRange(first: string, today: string): Range {
  const f = fromKey(first);
  const t = fromKey(today);
  const months = (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() + 1;
  const title = 'All time';
  if (months <= 1) {
    const count = t.getDate() - f.getDate() + 1;
    const buckets = Array.from({ length: count }, (_, i) => {
      const key = addDays(first, i);
      return {
        label: String(fromKey(key).getDate()),
        title: dayTitle(key),
        from: key,
        to: key,
        isCurrent: key === today,
      };
    });
    return { from: first, to: today, title, buckets };
  }
  if (months <= 36) {
    const buckets = Array.from({ length: months }, (_, i) => {
      const d = new Date(f.getFullYear(), f.getMonth() + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      // Up to a year, every month gets its initial; longer, only each year's start is named.
      const label = months <= 12 ? MONTHS[m][0] : m === 0 || i === 0 ? `'${String(y).slice(2)}` : '';
      return {
        label,
        title: `${MONTHS_LONG[m]} ${y}`,
        from: toKey(d),
        to: toKey(new Date(y, m + 1, 0)),
        isCurrent: i === months - 1,
      };
    });
    return { from: buckets[0].from, to: today, title, buckets };
  }
  const years = t.getFullYear() - f.getFullYear() + 1;
  const buckets = Array.from({ length: years }, (_, i) => {
    const y = f.getFullYear() + i;
    return { label: String(y), title: String(y), from: `${y}-01-01`, to: `${y}-12-31`, isCurrent: i === years - 1 };
  });
  return { from: buckets[0].from, to: today, title, buckets };
}

// ---------- weekly goal ----------

/** Monday of the week `key` is in. */
export function weekStart(key: string): string {
  return addDays(key, -((fromKey(key).getDay() + 6) % 7));
}

export type GoalStatus = {
  /** Workouts so far this week. */
  thisWeek: number;
  /** Which days this week (Mon = 0) had a workout. */
  weekDays: boolean[];
  /** Weeks in a row that reached the goal (this week counts once it's reached). */
  streak: number;
  /** Longest run of weeks that reached the goal. */
  best: number;
};

/** Progress towards a goal of `perWeek` workouts a week, and the streak of weeks that hit it. */
export function goalStatus(days: Days, perWeek: number): GoalStatus {
  const today = todayKey();
  const thisMonday = weekStart(today);
  const perWeekCount = new Map<string, number>();
  const weekDays = Array.from({ length: 7 }, () => false);
  for (const d of Object.keys(days)) {
    if (!days[d].some((e) => e.sets.some(counted))) continue;
    const w = weekStart(d);
    perWeekCount.set(w, (perWeekCount.get(w) ?? 0) + 1);
    if (w === thisMonday) weekDays[(fromKey(d).getDay() + 6) % 7] = true;
  }
  const thisWeek = perWeekCount.get(thisMonday) ?? 0;
  const hit = (w: string) => perWeek > 0 && (perWeekCount.get(w) ?? 0) >= perWeek;
  // This week only adds to the streak once it's reached; until then it doesn't break it.
  let streak = hit(thisMonday) ? 1 : 0;
  for (let w = addDays(thisMonday, -7); hit(w); w = addDays(w, -7)) streak++;
  // Longest streak ever.
  let best = 0;
  const weeks = [...perWeekCount.keys()].sort();
  if (weeks.length) {
    let run = 0;
    for (let w = weeks[0]; w <= thisMonday; w = addDays(w, 7)) {
      run = hit(w) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return { thisWeek, weekDays, streak, best };
}

// ---------- whole-workout totals ----------

export type Metric = 'volume' | 'reps' | 'sets' | 'workouts' | 'time';

/** A set counts once something was logged in it (reps, a time or a distance). */
const counted = isCounted;

export type DayTotals = Record<Metric, number>;

/** Totals for one day. Only logged workout times count towards `time` (minutes). */
export function dayTotals(entries: Entry[] | undefined, session: Session | undefined): DayTotals {
  let volume = 0;
  let reps = 0;
  let sets = 0;
  for (const e of entries ?? []) {
    for (const s of e.sets) {
      if (!counted(s)) continue;
      sets += 1;
      reps += setTotalReps(s);
      volume += setTotalVolume(s);
    }
  }
  const time = session?.logged && session.end ? (session.end - session.start) / 60000 : 0;
  return { volume, reps, sets, workouts: sets > 0 ? 1 : 0, time };
}

function emptyTotals(): DayTotals {
  return { volume: 0, reps: 0, sets: 0, workouts: 0, time: 0 };
}

function addTotals(a: DayTotals, b: DayTotals): DayTotals {
  return {
    volume: a.volume + b.volume,
    reps: a.reps + b.reps,
    sets: a.sets + b.sets,
    workouts: a.workouts + b.workouts,
    time: a.time + b.time,
  };
}

/** Logged dates within [from, to], in order. */
function datesIn(days: Days, sessions: Record<string, Session>, from: string, to: string) {
  const all = new Set([...Object.keys(days), ...Object.keys(sessions)]);
  return [...all].filter((d) => d >= from && d <= to).sort();
}

export function rangeTotals(days: Days, sessions: Record<string, Session>, from: string, to: string): DayTotals {
  return datesIn(days, sessions, from, to).reduce(
    (acc, d) => addTotals(acc, dayTotals(days[d], sessions[d])),
    emptyTotals(),
  );
}

export function bucketValues(days: Days, sessions: Record<string, Session>, range: Range, metric: Metric): number[] {
  return range.buckets.map((b) => rangeTotals(days, sessions, b.from, b.to)[metric]);
}

export type ShareBy = 'sets' | 'volume';

/** How much each muscle group got in the range, by sets or by volume (weight × reps), most first. */
export function groupBreakdown(
  days: Days,
  from: string,
  to: string,
  byId: Map<string, Exercise>,
  groupById: Map<string, Group>,
  by: ShareBy = 'sets',
): { group: Group; value: number }[] {
  const totals = new Map<string, number>();
  for (const d of Object.keys(days)) {
    if (d < from || d > to) continue;
    for (const e of days[d]) {
      const g = byId.get(e.exerciseId)?.group;
      if (!g || !groupById.has(g)) continue;
      const done = e.sets.filter(counted);
      const amount = by === 'sets' ? done.length : done.reduce((n, s) => n + setTotalVolume(s), 0);
      totals.set(g, (totals.get(g) ?? 0) + amount);
    }
  }
  return [...totals.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({ group: groupById.get(id)!, value }));
}

// ---------- one move over time ----------

export type MoveMetric =
  'oneRM' | 'weight' | 'bestSet' | 'volume' | 'reps' | 'bestReps' | 'longest' | 'duration' | 'distance';

export function moveValue(sets: WorkoutSet[], metric: MoveMetric): number {
  const done = sets.filter(counted);
  switch (metric) {
    case 'oneRM':
      return best1RM(done).value;
    case 'weight':
      return Math.max(0, ...done.map((s) => s.weight ?? 0));
    case 'bestSet':
      return bestSet(done).value;
    case 'volume':
      return done.reduce((n, s) => n + setTotalVolume(s), 0);
    case 'reps':
      return done.reduce((n, s) => n + setTotalReps(s), 0);
    case 'bestReps':
      return Math.max(0, ...done.map((s) => s.reps ?? 0));
    case 'longest':
      return Math.max(0, ...done.map((s) => s.time ?? 0));
    case 'duration':
      return done.reduce((n, s) => n + (s.time ?? 0), 0);
    case 'distance':
      return done.reduce((n, s) => n + (s.distance ?? 0), 0);
  }
}

/** One point per day the move was logged in [from, to]. */
export function moveSeries(
  days: Days,
  exerciseId: string,
  from: string,
  to: string,
  metric: MoveMetric,
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  for (const d of Object.keys(days).sort()) {
    if (d < from || d > to) continue;
    const sets = days[d].filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
    if (!sets.some(counted)) continue;
    points.push({ date: d, value: moveValue(sets, metric) });
  }
  return points;
}

export type MoveSession = {
  date: string;
  /** The sets that were logged (with something in them). */
  sets: WorkoutSet[];
  /** The best set of the day (see setScore). */
  best: WorkoutSet | null;
  /** That best set beat every earlier day of the move. */
  pr: boolean;
};

/** Every day a move was logged in [from, to], newest first, with its best set and PRs. */
export function moveHistory(
  days: Days,
  exerciseId: string,
  from: string,
  to: string,
  kind: MoveKind,
  bodyweight: number,
): MoveSession[] {
  const out: MoveSession[] = [];
  // PRs are judged against everything before, not just the range.
  let record = 0;
  for (const d of Object.keys(days).sort()) {
    if (d > to) break;
    const sets = days[d]
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter(counted);
    if (!sets.length) continue;
    const best = bestScored(sets, kind, bodyweight);
    const pr = best.value > 0 && best.value > record;
    record = Math.max(record, best.value);
    if (d >= from) out.push({ date: d, sets, best: best.set, pr });
  }
  return out.reverse();
}

export type MoveRecord = {
  id: string;
  /** The best set in the range, and the day it was done. */
  set: WorkoutSet;
  date: string;
  /** Best estimated 1RM in the range (weight moves). */
  oneRM: number;
};

/** Each move's best set in [from, to] (see setScore). */
export function moveRecords(
  days: Days,
  from: string,
  to: string,
  kindOf: (exerciseId: string) => MoveKind,
  bodyweight: number,
): MoveRecord[] {
  const best = new Map<string, MoveRecord & { score: number }>();
  for (const d of Object.keys(days)) {
    if (d < from || d > to) continue;
    for (const e of days[d]) {
      const sets = e.sets.filter(counted);
      if (!sets.length) continue;
      const kind = kindOf(e.exerciseId);
      const top = bestScored(sets, kind, bodyweight);
      const oneRM = kind === 'weight' ? best1RM(sets).value : 0;
      const cur = best.get(e.exerciseId);
      if (top.set && (!cur || top.value > cur.score))
        best.set(e.exerciseId, {
          id: e.exerciseId,
          set: top.set,
          date: d,
          score: top.value,
          oneRM: Math.max(oneRM, cur?.oneRM ?? 0),
        });
      else if (cur && oneRM > cur.oneRM) cur.oneRM = oneRM;
    }
  }
  return [...best.values()].map(({ score: _score, ...r }) => r);
}

/** Moves logged in the range, most-logged first. */
export function movesInRange(days: Days, from: string, to: string): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of Object.keys(days)) {
    if (d < from || d > to) continue;
    for (const e of days[d]) if (e.sets.some(counted)) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
}

/** A rounded-up axis maximum: 1, 2, 2.5, 5 × 10ⁿ. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) if (value <= m * exp) return m * exp;
  return 10 * exp;
}

/**
 * Axis range for a trend line: zoomed to the data (not from zero) so small changes show,
 * with round tick values.
 */
export function niceRange(values: number[]): { lo: number; hi: number } {
  if (!values.length) return { lo: 0, hi: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(max * 0.2, 1);
  const step = niceMax(span / 2);
  const lo = Math.max(0, Math.floor((min - span * 0.25) / step) * step);
  let hi = Math.ceil((max + span * 0.15) / step) * step;
  if (hi <= lo) hi = lo + step;
  return { lo, hi };
}

/** 12 400 → "12.4k", 980 → "980". */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(Math.round(n * 10) / 10);
}
