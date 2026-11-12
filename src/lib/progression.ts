import type { Unit, WorkoutSet } from '@/store/store';

/**
 * Automatic progression, applied when a past workout is copied to a new day:
 * - linear: add weight every time (same reps)
 * - double: add a rep to each set until every set reaches the top of the rep range, then
 *   add weight and go back to the bottom of the range
 * - dynamic (double dynamic): the same, but set by set: a set that reached the top of the range
 *   gets more weight on its own, the others add a rep
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
    hint: 'Like Double, but set by set: each set that reaches the top of the range gets more weight on its own.',
  },
];

/** Weight steps to choose from, per unit. */
export const PROGRESSION_STEPS: Record<Unit, number[]> = { kg: [1.25, 2.5, 5], lb: [2.5, 5, 10] };

export function progressionStep(p: ProgressionSettings, unit: Unit) {
  return p.step ?? (unit === 'kg' ? 2.5 : 5);
}

type SetValues = Pick<WorkoutSet, 'weight' | 'reps'>;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The next workout's sets for one move. Only sets with reps logged change; drops and
 * everything else on the set are kept. Returns whether anything changed.
 */
export function progressSets<S extends SetValues>(
  sets: S[],
  p: ProgressionSettings,
  step: number,
): { sets: S[]; changed: boolean } {
  if (p.style === 'off') return { sets, changed: false };
  const lo = Math.min(p.repMin, p.repMax);
  const hi = Math.max(p.repMin, p.repMax);
  const working = sets.filter((s) => (s.reps ?? 0) > 0);
  if (!working.length) return { sets, changed: false };

  const addWeight = (s: S): S => ({ ...s, weight: round((s.weight ?? 0) + step) });
  let next: S[];
  if (p.style === 'linear') {
    next = sets.map((s) => ((s.reps ?? 0) > 0 ? addWeight(s) : s));
  } else if (p.style === 'double') {
    const allTop = working.every((s) => (s.reps ?? 0) >= hi);
    next = sets.map((s) => {
      if (!((s.reps ?? 0) > 0)) return s;
      if (allTop) return { ...addWeight(s), reps: lo };
      return { ...s, reps: Math.min(hi, Math.max(lo, (s.reps ?? 0) + 1)) };
    });
  } else {
    next = sets.map((s) => {
      if (!((s.reps ?? 0) > 0)) return s;
      if ((s.reps ?? 0) >= hi) return { ...addWeight(s), reps: lo };
      return { ...s, reps: Math.min(hi, Math.max(lo, (s.reps ?? 0) + 1)) };
    });
  }
  const changed = next.some((s, i) => s.weight !== sets[i].weight || s.reps !== sets[i].reps);
  return { sets: next, changed };
}
