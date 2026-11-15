import type { Unit, WorkoutSet } from '@/store/store';

/**
 * Automatic progression, applied when a past workout is copied to a new day. Only sets that were
 * checked as done last time move up; a set left unchecked is repeated as it was.
 * - linear: more weight every workout, same reps
 * - double: a rep more on each set until every set reaches the top of the rep range, then more
 *   weight and back to the bottom of the range
 * - dynamic (dynamic double progression): judged by the first set only. Once it reaches the top
 *   of the range, the weight goes up for all sets and the first set starts again at the bottom;
 *   until then it aims for a rep more. The later sets are done hard and their reps fall where
 *   they fall, so they keep their weight and reps (shifted down with the first set after a jump).
 */
export type ProgressionStyle = 'off' | 'linear' | 'double' | 'dynamic';

export type ProgressionSettings = {
  style: ProgressionStyle;
  /** Rep range for double progression. */
  repMin: number;
  repMax: number;
  /** Weight added per step; null uses 2.5 kg / 5 lb. */
  step: number | null;
};

export const DEFAULT_PROGRESSION: ProgressionSettings = { style: 'off', repMin: 8, repMax: 12, step: null };

export const PROGRESSION_STYLES: { id: ProgressionStyle; label: string; hint: string }[] = [
  { id: 'off', label: 'Off', hint: 'Copied workouts keep the same weights and reps.' },
  { id: 'linear', label: 'Linear', hint: 'Adds weight every workout, with the same reps.' },
  {
    id: 'double',
    label: 'Double',
    hint: 'Adds a rep to each set until all sets reach the top of your rep range, then adds weight and starts again at the bottom.',
  },
  {
    id: 'dynamic',
    label: 'Double dynamic',
    hint: 'Goes by your first set: it aims for a rep more each time, and once it reaches the top of the range the weight goes up for every set and the first set starts again at the bottom. The other sets are just done hard.',
  },
];

/** Weight steps to choose from, per unit. */
export const PROGRESSION_STEPS: Record<Unit, number[]> = { kg: [1.25, 2.5, 5], lb: [2.5, 5, 10] };

export function progressionStep(p: ProgressionSettings, unit: Unit) {
  return p.step ?? (unit === 'kg' ? 2.5 : 5);
}

type SetValues = Pick<WorkoutSet, 'weight' | 'reps' | 'auto'>;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The next workout's sets for one move. `done` says which sets were checked off last time; only
 * those move up. Values that change are marked in `auto` (shown in their own colour). Drops and
 * everything else on a set are kept. Returns whether anything changed.
 */
export function progressSets<S extends SetValues>(
  sets: S[],
  done: boolean[],
  p: ProgressionSettings,
  step: number,
): { sets: S[]; changed: boolean } {
  if (p.style === 'off') return { sets, changed: false };
  const lo = Math.min(p.repMin, p.repMax);
  const hi = Math.max(p.repMin, p.repMax);
  const hasReps = (s: S) => (s.reps ?? 0) > 0;
  const working = sets.map((s, i) => ({ s, i })).filter(({ s }) => hasReps(s));
  if (!working.length) return { sets, changed: false };

  const next = sets.map((s) => ({ ...s }));
  const set = (i: number, field: 'weight' | 'reps', value: number) => {
    if (next[i][field] === value) return;
    next[i] = { ...next[i], [field]: value, auto: { ...next[i].auto, [field]: true } };
  };
  const addWeight = (i: number) => set(i, 'weight', round((sets[i].weight ?? 0) + step));
  const addRep = (i: number) => set(i, 'reps', Math.min(hi, Math.max(lo, (sets[i].reps ?? 0) + 1)));

  if (p.style === 'linear') {
    for (const { i } of working) if (done[i]) addWeight(i);
  } else if (p.style === 'double') {
    // All sets done and at the top of the range: heavier, back to the bottom. Otherwise a rep more
    // on each set that was done.
    const allTop = working.every(({ s, i }) => done[i] && (s.reps ?? 0) >= hi);
    for (const { s, i } of working) {
      if (allTop) {
        addWeight(i);
        set(i, 'reps', lo);
      } else if (done[i] && (s.reps ?? 0) < hi) addRep(i);
    }
  } else {
    // Dynamic: the first set decides.
    const first = working[0];
    if (done[first.i]) {
      const firstReps = first.s.reps ?? 0;
      if (firstReps >= hi) {
        // Heavier for every set; the first set starts again at the bottom, the others drop by
        // the same number of reps.
        const drop = firstReps - lo;
        for (const { s, i } of working) {
          addWeight(i);
          set(i, 'reps', i === first.i ? lo : Math.max(1, (s.reps ?? 0) - drop));
        }
      } else {
        addRep(first.i);
      }
    }
  }

  const changed = next.some((s, i) => s.weight !== sets[i].weight || s.reps !== sets[i].reps);
  return { sets: changed ? next : sets, changed };
}
