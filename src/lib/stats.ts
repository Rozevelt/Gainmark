import type { MoveKind } from '@/data/exercises';
import type { Entry, Unit, WorkoutSet } from '@/store/store';

type Days = Record<string, Entry[]>;

/** One set's volume: weight × reps (0 if either is missing). Drops aren't included. */
export function setVolume(s: WorkoutSet): number {
  return s.weight && s.weight > 0 && s.reps ? s.weight * s.reps : 0;
}

/** A set's volume including its drops. */
export function setTotalVolume(s: WorkoutSet): number {
  let v = setVolume(s);
  for (const d of s.drops ?? []) if (d.weight && d.weight > 0 && d.reps) v += d.weight * d.reps;
  return v;
}

/** A set's reps including its drops. */
export function setTotalReps(s: WorkoutSet): number {
  return (s.reps ?? 0) + (s.drops ?? []).reduce((n, d) => n + (d.reps ?? 0), 0);
}

/** A set counts once something was logged in it (reps, a time or a distance). */
export function isCounted(s: WorkoutSet) {
  return (s.reps ?? 0) > 0 || (s.time ?? 0) > 0 || (s.distance ?? 0) > 0;
}

/** Body weight assumed for bodyweight PRs when none has been logged. */
export const NOMINAL_BODYWEIGHT: Record<Unit, number> = { kg: 75, lb: 165 };

/**
 * How good a set is, for PRs and "better than last time":
 * weight moves weight × reps; bodyweight moves (body weight + added) × reps;
 * timed moves the time; cardio the distance (or the time when no distance is logged).
 */
export function setScore(s: WorkoutSet, kind: MoveKind = 'weight', bodyweight = 0): number {
  switch (kind) {
    case 'bodyweight':
      return s.reps ? Math.max(0, bodyweight + (s.weight ?? 0)) * s.reps : 0;
    case 'time':
      return s.time ?? 0;
    case 'cardio':
      return s.distance ? s.distance * 1e6 : (s.time ?? 0);
    default:
      return setVolume(s);
  }
}

/** The best set by `setScore`. */
export function bestScored(sets: WorkoutSet[], kind: MoveKind = 'weight', bodyweight = 0) {
  let best = { value: 0, set: null as WorkoutSet | null };
  for (const s of sets) {
    const v = setScore(s, kind, bodyweight);
    if (v > best.value) best = { value: v, set: s };
  }
  return best;
}

/** The set with the highest weight × reps. */
export function bestSet(sets: WorkoutSet[]): { value: number; set: WorkoutSet | null } {
  let best = { value: 0, set: null as WorkoutSet | null };
  for (const s of sets) {
    const v = setVolume(s);
    if (v > best.value) best = { value: v, set: s };
  }
  return best;
}

/** Estimated one-rep max (Epley formula). One rep is the weight itself. */
export function estimate1RM(weight: number | null, reps: number | null): number {
  if (!weight || !reps || reps < 1) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Best estimated 1RM across sets, with the set it came from. */
export function best1RM(sets: WorkoutSet[]): { value: number; set: WorkoutSet | null } {
  let best = { value: 0, set: null as WorkoutSet | null };
  for (const s of sets) {
    const v = estimate1RM(s.weight, s.reps);
    if (v > best.value) best = { value: v, set: s };
  }
  return best;
}

/** Best set score (see setScore) for this move on any day before `date` (0 if never). */
export function bestSetBefore(
  days: Days,
  sortedDates: string[],
  exerciseId: string,
  date: string,
  kind: MoveKind = 'weight',
  bodyweight = 0,
) {
  let best = 0;
  for (const d of sortedDates) {
    if (d >= date) break;
    for (const e of days[d])
      if (e.exerciseId === exerciseId) best = Math.max(best, bestScored(e.sets, kind, bodyweight).value);
  }
  return best;
}

/** Best estimated 1RM this move ever reached, and on which day. */
export function allTime1RM(days: Days, exerciseId: string): { value: number; date: string | null } {
  let best = { value: 0, date: null as string | null };
  for (const [d, entries] of Object.entries(days)) {
    for (const e of entries) {
      if (e.exerciseId !== exerciseId) continue;
      const v = best1RM(e.sets).value;
      if (v > best.value) best = { value: v, date: d };
    }
  }
  return best;
}

/** Round to the nearest weight step you can actually load (2.5 kg / 5 lb). */
export function roundToStep(weight: number, unit: Unit) {
  const step = unit === 'kg' ? 2.5 : 5;
  return Math.round(weight / step) * step;
}

/** Every plate size Gainmark knows, heaviest first. */
export const ALL_PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [55, 45, 35, 25, 10, 5, 2.5],
};

/** Plates used for plate math unless changed in Settings (no 25 kg / 55 lb). */
export const DEFAULT_PLATES: Record<Unit, number[]> = {
  kg: [20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export type PlateMath =
  | { kind: 'none' }
  | { kind: 'below-bar' }
  | { kind: 'bar-only' }
  | { kind: 'plates'; perSide: number; plates: number[]; leftover: number };

/** Plates to load on each side of the bar for a total weight, using the given plate sizes. */
export function plateMath(total: number | null, bar: number, plates: number[]): PlateMath {
  if (total == null || total <= 0) return { kind: 'none' };
  if (total < bar) return { kind: 'below-bar' };
  if (total === bar) return { kind: 'bar-only' };
  const perSide = (total - bar) / 2;
  let rest = perSide;
  const loaded: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (rest >= p - 1e-9) {
      loaded.push(p);
      rest = Math.round((rest - p) * 1000) / 1000;
    }
  }
  return { kind: 'plates', perSide, plates: loaded, leftover: rest };
}

export function plateText(math: PlateMath, bar: number, unit: Unit): string | null {
  switch (math.kind) {
    case 'none':
      return null;
    case 'below-bar':
      return `Less than the ${fmt(bar)} ${unit} bar`;
    case 'bar-only':
      return 'Empty bar';
    case 'plates':
      return `${math.plates.map(fmt).join(' + ')} per side${math.leftover > 0 ? ` (+${fmt(math.leftover)} short)` : ''}`;
  }
}

/** 1 550 → "1,550"; keeps up to 2 decimals. */
export function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  const [int, dec] = String(r).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
}
