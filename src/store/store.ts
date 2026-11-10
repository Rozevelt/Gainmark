import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { BAR_WEIGHT, BUILTIN_EXERCISES, type Exercise, type MoveKind } from '@/data/exercises';
import { DEFAULT_GROUPS, GROUP_COLORS, LEGACY_MUSCLE_TO_GROUP, type Group } from '@/data/groups';
import type { Split, SplitDay } from '@/data/splits';
import { todayKey } from '@/lib/dates';
import { cancelRestAlert, scheduleRestAlert } from '@/lib/rest-alert';
import { DEFAULT_PLATES } from '@/lib/stats';

/**
 * One set. Weight moves use weight × reps; bodyweight moves use reps with `weight` as added
 * weight (negative = assisted); timed moves use `time` (seconds); cardio uses `time` and
 * `distance` (km or miles, following the weight unit).
 */
export type WorkoutSet = {
  id: string;
  weight: number | null;
  reps: number | null;
  time?: number | null;
  distance?: number | null;
  done?: boolean;
};
/**
 * `warmupDone` ticks the move's warm-up steps (only used when warm-ups are on for the move).
 * Moves next to each other with the same `superset` id are done as a superset.
 */
export type Entry = { id: string; exerciseId: string; sets: WorkoutSet[]; warmupDone?: boolean[]; superset?: string };
export type Unit = 'kg' | 'lb';
export type Reminder = { enabled: boolean; hour: number; minute: number };

/**
 * A timed workout: started at `start`, finished at `end` (ms since epoch). Only `logged`
 * times count anywhere (calendar, progress); unlogged ones wait for Log or Delete.
 */
export type Session = { start: number; end?: number; logged?: boolean };

/** `enabled` shows the workout timer; `autoStart` starts it when the first set is checked. */
export type TimerSettings = { enabled: boolean; autoStart: boolean };
export const DEFAULT_TIMER: TimerSettings = { enabled: true, autoStart: false };

/**
 * Rest timer: `autoStart` starts it when a set is checked (today only), `seconds` is the
 * default rest for moves without their own, `notify` alerts when Gainmark is in the background.
 */
export type RestSettings = { autoStart: boolean; seconds: number; notify: boolean };
export const DEFAULT_REST: RestSettings = { autoStart: false, seconds: 90, notify: false };

/** Extra info on move cards. Both off by default to keep the cards clean. */
export type DisplaySettings = { oneRM: boolean; plates: boolean };
export const DEFAULT_DISPLAY: DisplaySettings = { oneRM: false, plates: false };

/** Weekly goal: how many workouts a week (0 = no goal). */
export type GoalSettings = { perWeek: number };
export const DEFAULT_GOAL: GoalSettings = { perWeek: 3 };

/** Automatic daily backups kept on the phone. */
export type BackupSettings = { auto: boolean };
export const DEFAULT_BACKUP: BackupSettings = { auto: true };

/** One warm-up step: `pct` of the move's top working weight, for `reps` reps. */
export type WarmupStep = { pct: number; reps: number };
export const DEFAULT_WARMUP: WarmupStep[] = [
  { pct: 50, reps: 8 },
  { pct: 70, reps: 3 },
  { pct: 100, reps: 1 },
];

/** The countdown on screen (rest between sets, or the general timer). */
export type Countdown = { kind: 'rest' | 'timer'; endsAt: number; duration: number; label: string };

/**
 * `plates` overrides the default plate sizes per unit (see DEFAULT_PLATES).
 * `split` is the weekly gym split (unset until the user picks one).
 */
export type Settings = {
  unit: Unit;
  plates?: Partial<Record<Unit, number[]>>;
  split?: Split;
  reminder?: Reminder;
  timer?: TimerSettings;
  rest?: RestSettings;
  display?: DisplaySettings;
  warmup?: WarmupStep[];
  backup?: BackupSettings;
  goal?: GoalSettings;
};

export const DEFAULT_REMINDER: Reminder = { enabled: false, hour: 17, minute: 0 };

type Days = Record<string, Entry[]>;

type State = {
  ready: boolean;
  /** The day the main screen is showing. */
  viewDate: string;
  /** Logged workouts by "YYYY-MM-DD". Only days with at least one move are kept. */
  days: Days;
  customExercises: Exercise[];
  settings: Settings;
  /** Workout timers by "YYYY-MM-DD". */
  sessions: Record<string, Session>;
  startWorkout: (date: string) => void;
  finishWorkout: (date: string) => void;
  resumeWorkout: (date: string) => void;
  resetWorkout: (date: string) => void;
  logWorkout: (date: string) => void;
  setTimerSettings: (patch: Partial<TimerSettings>) => void;
  /** Muscle groups in display order (defaults + the user's own). */
  groups: Group[];
  /** Per-move overrides. `bar: null` means the move doesn't use a bar; `group` moves it to another group. */
  exerciseSettings: Record<
    string,
    { bar?: number | null; group?: string; rest?: number; warmup?: boolean; kind?: MoveKind }
  >;
  setExerciseKind: (exerciseId: string, kind: MoveKind) => void;
  /** Body weight by "YYYY-MM-DD", in the weight unit. */
  bodyweights: Record<string, number>;
  setBodyweight: (date: string, value: number | null) => void;
  setGoal: (perWeek: number) => void;
  /** Join a move to the move above it as a superset (or to that move's superset). */
  linkSuperset: (date: string, entryId: string) => void;
  /** Take a move out of its superset. */
  unlinkSuperset: (date: string, entryId: string) => void;
  setExerciseRest: (exerciseId: string, seconds: number | undefined) => void;
  /** Turn warm-up sets on or off for a move. */
  setExerciseWarmup: (exerciseId: string, on: boolean) => void;
  setWarmupSteps: (steps: WarmupStep[]) => void;
  toggleWarmupDone: (date: string, entryId: string, step: number) => void;
  setRestSettings: (patch: Partial<RestSettings>) => void;
  setDisplaySettings: (patch: Partial<DisplaySettings>) => void;
  setBackupSettings: (patch: Partial<BackupSettings>) => void;
  /** Replace everything (workouts, moves, groups, settings, times) with imported data. */
  replaceAllData: (data: AppData) => Promise<void>;
  /** Running countdown, or null. Not saved: it only matters while the app is open. */
  countdown: Countdown | null;
  startCountdown: (seconds: number, label: string, kind?: Countdown['kind']) => void;
  adjustCountdown: (seconds: number) => void;
  stopCountdown: () => void;
  setBar: (exerciseId: string, bar: number | null) => void;
  setExerciseGroup: (exerciseId: string, groupId: string) => void;
  addGroup: (name: string, color: string) => Group;
  updateGroup: (id: string, patch: Partial<Pick<Group, 'name' | 'color'>>) => void;
  deleteGroup: (id: string) => void;

  load: () => Promise<void>;
  setViewDate: (date: string) => void;
  addExercises: (date: string, exerciseIds: string[]) => void;
  removeEntry: (date: string, entryId: string) => void;
  /** Delete a whole workout: every move on the day and its workout time. */
  deleteDay: (date: string) => void;
  /** Put a day's moves in the given order (entry ids). */
  reorderEntries: (date: string, orderedIds: string[]) => void;
  addSet: (date: string, entryId: string) => void;
  updateSet: (date: string, entryId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  removeSet: (date: string, entryId: string, setId: string) => void;
  /** Put a set back at `index` (used by Undo after deleting). */
  insertSet: (date: string, entryId: string, set: WorkoutSet, index: number) => void;
  /** Add `delta` to a set's weight or reps (never below 0). Empty values start from `start`. */
  stepSet: (
    date: string,
    entryId: string,
    setId: string,
    field: 'weight' | 'reps' | 'time' | 'distance',
    delta: number,
    start: number | null,
    /** Lowest value allowed (0 unless set; bodyweight moves go negative for assisted). */
    min?: number,
  ) => void;
  toggleSetDone: (date: string, entryId: string, setId: string) => void;
  copyWorkout: (from: string, to: string, mode: 'append' | 'replace') => void;
  createExercise: (name: string, groupId: string, kind?: MoveKind) => Exercise;
  deleteExercise: (id: string) => void;
  setUnit: (unit: Unit) => void;
  setPlates: (unit: Unit, plates: number[]) => void;
  setSplit: (split: Split) => void;
  /** `weekday` is a Date.getDay() index (0 = Sunday). */
  setSplitDay: (weekday: number, day: SplitDay) => void;
  setReminder: (patch: Partial<Reminder>) => void;
  /** Check or uncheck every set of a move at once. */
  setEntryDone: (date: string, entryId: string, done: boolean) => void;
};

// ---------- persistence ----------
// Each day is saved under its own key so an edit only rewrites that one day.

const PREFIX = 'gm:';
const DAY_PREFIX = `${PREFIX}day:`;
const CUSTOM_KEY = `${PREFIX}custom`;
const SETTINGS_KEY = `${PREFIX}settings`;
const EX_SETTINGS_KEY = `${PREFIX}exsettings`;
const GROUPS_KEY = `${PREFIX}groups`;
const SESSIONS_KEY = `${PREFIX}sessions`;
const BODYWEIGHT_KEY = `${PREFIX}bodyweight`;

const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function markDirty(key: string) {
  dirty.add(key);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 300);
}

async function flush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const keys = [...dirty];
  dirty.clear();
  const { days, customExercises, settings, exerciseSettings, groups, sessions, bodyweights } = useStore.getState();
  await Promise.all(
    keys.map((key) => {
      if (key === CUSTOM_KEY) return AsyncStorage.setItem(key, JSON.stringify(customExercises));
      if (key === SETTINGS_KEY) return AsyncStorage.setItem(key, JSON.stringify(settings));
      if (key === EX_SETTINGS_KEY) return AsyncStorage.setItem(key, JSON.stringify(exerciseSettings));
      if (key === GROUPS_KEY) return AsyncStorage.setItem(key, JSON.stringify(groups));
      if (key === SESSIONS_KEY) return AsyncStorage.setItem(key, JSON.stringify(sessions));
      if (key === BODYWEIGHT_KEY) return AsyncStorage.setItem(key, JSON.stringify(bodyweights));
      const entries = days[key.slice(DAY_PREFIX.length)];
      return entries?.length
        ? AsyncStorage.setItem(key, JSON.stringify(entries))
        : AsyncStorage.removeItem(key);
    }),
  );
}

// Save straight away when the app is sent to the background.
AppState.addEventListener('change', (s) => {
  if (s !== 'active' && dirty.size) flush();
});

/** Everything Gainmark saves, as one object (for export and backups). */
export type AppData = Pick<
  State,
  'days' | 'customExercises' | 'settings' | 'exerciseSettings' | 'groups' | 'sessions' | 'bodyweights'
>;

export function getAppData(): AppData {
  const { days, customExercises, settings, exerciseSettings, groups, sessions, bodyweights } = useStore.getState();
  return { days, customExercises, settings, exerciseSettings, groups, sessions, bodyweights };
}

/**
 * Add any built-in group that's missing (e.g. after an update adds one). If its colour is
 * already taken by one of the user's groups, it gets the first free colour.
 */
function withDefaultGroups(groups: Group[]): Group[] {
  let out = groups;
  for (const g of DEFAULT_GROUPS) {
    if (out.some((x) => x.id === g.id)) continue;
    const taken = new Set(out.map((x) => x.color));
    const color = taken.has(g.color) ? (GROUP_COLORS.find((col) => !taken.has(col)) ?? g.color) : g.color;
    out = [...out, { ...g, color }];
  }
  return out;
}

function withoutSuperset(e: Entry): Entry {
  const { superset: _unused, ...rest } = e;
  return rest;
}

/**
 * Supersets are runs of neighbouring moves with the same id. After moves are moved or removed,
 * a run of one is no superset, and a split-up run gets a new id for its second part.
 */
function normalizeSupersets(entries: Entry[]): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < entries.length) {
    const id = entries[i].superset;
    let j = i + 1;
    if (id) while (j < entries.length && entries[j].superset === id) j++;
    const run = entries.slice(i, j);
    if (!id) out.push(...run);
    else if (run.length < 2) out.push(...run.map(withoutSuperset));
    else {
      const next = seen.has(id) ? newId() : id;
      seen.add(next);
      out.push(...run.map((e) => (e.superset === next ? e : { ...e, superset: next })));
    }
    i = j;
  }
  // Keep the same array when nothing changed (avoids needless saves and renders).
  return out.every((e, k) => e === entries[k]) ? entries : out;
}

// ---------- helpers ----------

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function withDay(days: Days, date: string, entries: Entry[]): Days {
  const next = { ...days };
  if (entries.length) next[date] = entries;
  else delete next[date];
  markDirty(DAY_PREFIX + date);
  return next;
}

function mapEntry(entries: Entry[], entryId: string, fn: (e: Entry) => Entry) {
  return entries.map((e) => (e.id === entryId ? fn(e) : e));
}

const EMPTY: Entry[] = [];

function beginCountdown(seconds: number, label: string, notify: boolean, kind: Countdown['kind'] = 'rest'): Countdown {
  const endsAt = Date.now() + seconds * 1000;
  if (notify) scheduleRestAlert(endsAt, label, kind);
  else cancelRestAlert();
  return { kind, endsAt, duration: seconds, label };
}

/**
 * After sets are checked or unchecked: start the timer if auto-start is on, and stop it
 * once every set of the day is checked.
 */
function timerAfterCheck(
  s: State,
  date: string,
  days: Days,
  checkedSomething: boolean,
): Partial<Pick<State, 'sessions'>> {
  const timer = { ...DEFAULT_TIMER, ...s.settings.timer };
  if (!timer.enabled) return {};
  let session = s.sessions[date];
  if (!session && timer.autoStart && checkedSomething && date === todayKey()) {
    session = { start: Date.now() };
  }
  if (!session) return {};
  const sets = (days[date] ?? []).flatMap((e) => e.sets);
  if (!session.end && sets.length > 0 && sets.every((x) => x.done)) session = { ...session, end: Date.now() };
  if (session === s.sessions[date]) return {};
  markDirty(SESSIONS_KEY);
  return { sessions: { ...s.sessions, [date]: session } };
}

// ---------- store ----------

export const useStore = create<State>()((set, get) => ({
  ready: false,
  viewDate: todayKey(),
  days: {},
  customExercises: [],
  settings: { unit: 'kg' },
  groups: DEFAULT_GROUPS,
  exerciseSettings: {},
  sessions: {},
  bodyweights: {},
  countdown: null,

  load: async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      const pairs = await AsyncStorage.multiGet(keys);
      const days: Days = {};
      let customExercises: Exercise[] = [];
      let settings: Settings = { unit: 'kg' };
      let exerciseSettings: State['exerciseSettings'] = {};
      let groups: Group[] = DEFAULT_GROUPS;
      let sessions: Record<string, Session> = {};
      let bodyweights: Record<string, number> = {};
      for (const [key, value] of pairs) {
        if (!value) continue;
        if (key.startsWith(DAY_PREFIX)) days[key.slice(DAY_PREFIX.length)] = JSON.parse(value);
        else if (key === CUSTOM_KEY) customExercises = JSON.parse(value);
        else if (key === SETTINGS_KEY) settings = { ...settings, ...JSON.parse(value) };
        else if (key === EX_SETTINGS_KEY) exerciseSettings = JSON.parse(value);
        else if (key === GROUPS_KEY) groups = JSON.parse(value);
        else if (key === SESSIONS_KEY) sessions = JSON.parse(value);
        else if (key === BODYWEIGHT_KEY) bodyweights = JSON.parse(value);
      }
      groups = withDefaultGroups(groups);
      // Moves saved before groups existed have a `muscle` instead of a `group`.
      customExercises = customExercises.map((e) => {
        const legacy = (e as Exercise & { muscle?: string }).muscle;
        return e.group ? e : { ...e, group: LEGACY_MUSCLE_TO_GROUP[legacy ?? ''] ?? 'legs' };
      });
      set({ days, customExercises, settings, exerciseSettings, groups, sessions, bodyweights, ready: true });
    } catch (e) {
      console.warn('Failed to load saved data', e);
      set({ ready: true });
    }
  },

  setViewDate: (date) => set({ viewDate: date }),

  addExercises: (date, exerciseIds) =>
    set((s) => {
      const added = exerciseIds.map((exerciseId) => ({
        id: newId(),
        exerciseId,
        sets: [{ id: newId(), weight: null, reps: null }],
      }));
      return { days: withDay(s.days, date, [...(s.days[date] ?? EMPTY), ...added]) };
    }),

  removeEntry: (date, entryId) =>
    set((s) => ({
      days: withDay(s.days, date, normalizeSupersets((s.days[date] ?? EMPTY).filter((e) => e.id !== entryId))),
    })),

  deleteDay: (date) =>
    set((s) => {
      const sessions = { ...s.sessions };
      if (sessions[date]) {
        delete sessions[date];
        markDirty(SESSIONS_KEY);
      }
      return { days: withDay(s.days, date, []), sessions };
    }),

  reorderEntries: (date, orderedIds) =>
    set((s) => {
      const entries = s.days[date] ?? EMPTY;
      const byId = new Map(entries.map((e) => [e.id, e]));
      const ordered = orderedIds.map((id) => byId.get(id)).filter((e): e is Entry => !!e);
      // Keep anything not in the list at the end, so nothing is ever lost.
      const rest = entries.filter((e) => !orderedIds.includes(e.id));
      return { days: withDay(s.days, date, normalizeSupersets([...ordered, ...rest])) };
    }),

  linkSuperset: (date, entryId) =>
    set((s) => {
      const entries = s.days[date] ?? EMPTY;
      const i = entries.findIndex((e) => e.id === entryId);
      if (i < 1) return {};
      const above = entries[i - 1];
      const self = entries[i];
      const id = above.superset ?? self.superset ?? newId();
      // Everything in this move's old superset joins too, so the run stays one superset.
      const next = entries.map((e, k) =>
        k === i - 1 || k === i || (self.superset && e.superset === self.superset) ? { ...e, superset: id } : e,
      );
      return { days: withDay(s.days, date, normalizeSupersets(next)) };
    }),

  unlinkSuperset: (date, entryId) =>
    set((s) => {
      const entries = s.days[date] ?? EMPTY;
      const i = entries.findIndex((e) => e.id === entryId);
      const id = entries[i]?.superset;
      if (!id) return {};
      // Split the run at this move: the moves after it keep a superset of their own.
      const after = newId();
      const next = entries.map((e, k) => {
        if (k === i) return withoutSuperset(e);
        return k > i && e.superset === id ? { ...e, superset: after } : e;
      });
      return { days: withDay(s.days, date, normalizeSupersets(next)) };
    }),

  addSet: (date, entryId) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => {
          const last = e.sets[e.sets.length - 1];
          // New sets start with the same numbers as the set above.
          const fresh: WorkoutSet = {
            id: newId(),
            weight: last?.weight ?? null,
            reps: last?.reps ?? null,
            ...(last?.time != null ? { time: last.time } : null),
            ...(last?.distance != null ? { distance: last.distance } : null),
          };
          return { ...e, sets: [...e.sets, fresh] };
        }),
      ),
    })),

  updateSet: (date, entryId, setId, patch) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => ({
          ...e,
          sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)),
        })),
      ),
    })),

  removeSet: (date, entryId, setId) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => ({
          ...e,
          sets: e.sets.filter((x) => x.id !== setId),
        })),
      ),
    })),

  insertSet: (date, entryId, setToInsert, index) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => {
          if (e.sets.some((x) => x.id === setToInsert.id)) return e;
          const sets = [...e.sets];
          sets.splice(Math.min(index, sets.length), 0, setToInsert);
          return { ...e, sets };
        }),
      ),
    })),

  stepSet: (date, entryId, setId, field, delta, start, min = 0) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => ({
          ...e,
          sets: e.sets.map((x) => {
            if (x.id !== setId) return x;
            const next = Math.max(min, Math.round(((x[field] ?? start ?? 0) + delta) * 100) / 100);
            return { ...x, [field]: next };
          }),
        })),
      ),
    })),

  toggleSetDone: (date, entryId, setId) =>
    set((s) => {
      const wasDone = (s.days[date] ?? EMPTY).find((e) => e.id === entryId)?.sets.find((x) => x.id === setId)?.done;
      const days = withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => ({
          ...e,
          sets: e.sets.map((x) => (x.id === setId ? { ...x, done: !x.done } : x)),
        })),
      );
      const timer = timerAfterCheck(s, date, days, !wasDone);
      // Checking a set (today) starts the rest timer, unless that was the last set of the day.
      const rest = { ...DEFAULT_REST, ...s.settings.rest };
      const allDone = (days[date] ?? []).every((e) => e.sets.every((x) => x.done));
      // In a superset, rest starts after the last move of the superset, not between its moves.
      const list = days[date] ?? [];
      const at = list.findIndex((e) => e.id === entryId);
      const midSuperset = at >= 0 && !!list[at].superset && list[at + 1]?.superset === list[at].superset;
      if (!wasDone && rest.autoStart && date === todayKey() && !allDone && !midSuperset) {
        const entry = list[at];
        const exerciseId = entry?.exerciseId ?? '';
        const seconds = s.exerciseSettings[exerciseId]?.rest ?? rest.seconds;
        const name =
          s.customExercises.find((e) => e.id === exerciseId)?.name ??
          BUILTIN_EXERCISES.find((e) => e.id === exerciseId)?.name ??
          '';
        return { days, ...timer, countdown: beginCountdown(seconds, name, rest.notify) };
      }
      // Finishing the whole day clears a running rest.
      if (allDone && s.countdown) {
        cancelRestAlert();
        return { days, ...timer, countdown: null };
      }
      return { days, ...timer };
    }),

  copyWorkout: (from, to, mode) =>
    set((s) => {
      // Supersets get fresh ids so the copy doesn't share them with the original day.
      const ids = new Map<string, string>();
      const copied = (s.days[from] ?? EMPTY).map((e): Entry => {
        if (e.superset && !ids.has(e.superset)) ids.set(e.superset, newId());
        return {
          id: newId(),
          exerciseId: e.exerciseId,
          sets: e.sets.map((x) => ({
            id: newId(),
            weight: x.weight,
            reps: x.reps,
            ...(x.time != null ? { time: x.time } : null),
            ...(x.distance != null ? { distance: x.distance } : null),
          })),
          ...(e.superset ? { superset: ids.get(e.superset) } : null),
        };
      });
      const base = mode === 'append' ? (s.days[to] ?? EMPTY) : EMPTY;
      return { days: withDay(s.days, to, normalizeSupersets([...base, ...copied])) };
    }),

  createExercise: (name, groupId, kind) => {
    const exercise: Exercise = {
      id: `custom-${newId()}`,
      name: name.trim(),
      group: groupId,
      custom: true,
      ...(kind && kind !== 'weight' ? { kind } : null),
    };
    set((s) => ({ customExercises: [...s.customExercises, exercise] }));
    markDirty(CUSTOM_KEY);
    return exercise;
  },

  deleteExercise: (id) => {
    set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) }));
    markDirty(CUSTOM_KEY);
  },

  setBar: (exerciseId, bar) => {
    set((s) => ({
      exerciseSettings: {
        ...s.exerciseSettings,
        [exerciseId]: { ...s.exerciseSettings[exerciseId], bar },
      },
    }));
    markDirty(EX_SETTINGS_KEY);
  },

  setExerciseGroup: (exerciseId, groupId) => {
    set((s) => ({
      exerciseSettings: {
        ...s.exerciseSettings,
        [exerciseId]: { ...s.exerciseSettings[exerciseId], group: groupId },
      },
    }));
    markDirty(EX_SETTINGS_KEY);
  },

  addGroup: (name, color) => {
    const group: Group = { id: `group-${newId()}`, name: name.trim(), color, custom: true };
    set((s) => ({ groups: [...s.groups, group] }));
    markDirty(GROUPS_KEY);
    return group;
  },

  updateGroup: (id, patch) => {
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
    markDirty(GROUPS_KEY);
  },

  deleteGroup: (id) => {
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
    markDirty(GROUPS_KEY);
  },

  setPlates: (unit, plates) => {
    set((s) => ({ settings: { ...s.settings, plates: { ...s.settings.plates, [unit]: plates } } }));
    markDirty(SETTINGS_KEY);
  },

  setSplit: (split) => {
    set((s) => ({ settings: { ...s.settings, split } }));
    markDirty(SETTINGS_KEY);
  },

  setSplitDay: (weekday, day) => {
    set((s) => {
      const split = [...(s.settings.split ?? [null, null, null, null, null, null, null])];
      split[weekday] = day;
      return { settings: { ...s.settings, split } };
    });
    markDirty(SETTINGS_KEY);
  },

  setReminder: (patch) => {
    set((s) => ({
      settings: { ...s.settings, reminder: { ...DEFAULT_REMINDER, ...s.settings.reminder, ...patch } },
    }));
    markDirty(SETTINGS_KEY);
  },

  setEntryDone: (date, entryId, done) =>
    set((s) => {
      const days = withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => ({
          ...e,
          sets: e.sets.map((x) => ({ ...x, done })),
        })),
      );
      return { days, ...timerAfterCheck(s, date, days, done) };
    }),

  startWorkout: (date) => {
    set((s) => ({ sessions: { ...s.sessions, [date]: { start: Date.now() } } }));
    markDirty(SESSIONS_KEY);
  },

  finishWorkout: (date) => {
    set((s) => {
      const session = s.sessions[date];
      if (!session || session.end) return {};
      return { sessions: { ...s.sessions, [date]: { ...session, end: Date.now() } } };
    });
    markDirty(SESSIONS_KEY);
  },

  resumeWorkout: (date) => {
    set((s) => {
      const session = s.sessions[date];
      if (!session) return {};
      return { sessions: { ...s.sessions, [date]: { start: session.start } } };
    });
    markDirty(SESSIONS_KEY);
  },

  logWorkout: (date) => {
    set((s) => {
      const session = s.sessions[date];
      if (!session?.end) return {};
      return { sessions: { ...s.sessions, [date]: { ...session, logged: true } } };
    });
    markDirty(SESSIONS_KEY);
  },

  resetWorkout: (date) => {
    set((s) => {
      const sessions = { ...s.sessions };
      delete sessions[date];
      return { sessions };
    });
    markDirty(SESSIONS_KEY);
  },

  setExerciseWarmup: (exerciseId, on) => {
    set((s) => ({
      exerciseSettings: {
        ...s.exerciseSettings,
        [exerciseId]: { ...s.exerciseSettings[exerciseId], warmup: on },
      },
    }));
    markDirty(EX_SETTINGS_KEY);
  },

  setExerciseKind: (exerciseId, kind) => {
    set((s) => ({
      exerciseSettings: {
        ...s.exerciseSettings,
        [exerciseId]: { ...s.exerciseSettings[exerciseId], kind },
      },
    }));
    markDirty(EX_SETTINGS_KEY);
  },

  setBodyweight: (date, value) => {
    set((s) => {
      const bodyweights = { ...s.bodyweights };
      if (value && value > 0) bodyweights[date] = value;
      else delete bodyweights[date];
      return { bodyweights };
    });
    markDirty(BODYWEIGHT_KEY);
  },

  setGoal: (perWeek) => {
    set((s) => ({ settings: { ...s.settings, goal: { perWeek: Math.max(0, Math.min(7, perWeek)) } } }));
    markDirty(SETTINGS_KEY);
  },

  setWarmupSteps: (steps) => {
    set((s) => ({ settings: { ...s.settings, warmup: steps } }));
    markDirty(SETTINGS_KEY);
  },

  toggleWarmupDone: (date, entryId, step) =>
    set((s) => ({
      days: withDay(
        s.days,
        date,
        mapEntry(s.days[date] ?? EMPTY, entryId, (e) => {
          const done = [...(e.warmupDone ?? [])];
          done[step] = !done[step];
          return { ...e, warmupDone: done };
        }),
      ),
    })),

  setExerciseRest: (exerciseId, seconds) => {
    set((s) => ({
      exerciseSettings: {
        ...s.exerciseSettings,
        [exerciseId]: { ...s.exerciseSettings[exerciseId], rest: seconds },
      },
    }));
    markDirty(EX_SETTINGS_KEY);
  },

  setDisplaySettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, display: { ...DEFAULT_DISPLAY, ...s.settings.display, ...patch } } }));
    markDirty(SETTINGS_KEY);
  },

  setBackupSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, backup: { ...DEFAULT_BACKUP, ...s.settings.backup, ...patch } } }));
    markDirty(SETTINGS_KEY);
  },

  replaceAllData: async (data) => {
    // Drop pending saves of the old data, then rewrite storage from scratch.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    dirty.clear();
    const days: Days = {};
    for (const [date, entries] of Object.entries(data.days ?? {})) if (entries?.length) days[date] = entries;
    const groups = withDefaultGroups(data.groups?.length ? data.groups : DEFAULT_GROUPS);
    const next = {
      days,
      customExercises: data.customExercises ?? [],
      settings: { ...data.settings, unit: data.settings?.unit === 'lb' ? ('lb' as const) : ('kg' as const) },
      exerciseSettings: data.exerciseSettings ?? {},
      groups,
      sessions: data.sessions ?? {},
      bodyweights: data.bodyweights ?? {},
    };
    const old = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    await AsyncStorage.multiRemove(old);
    await AsyncStorage.multiSet([
      ...Object.entries(days).map(([d, e]): [string, string] => [DAY_PREFIX + d, JSON.stringify(e)]),
      [CUSTOM_KEY, JSON.stringify(next.customExercises)],
      [SETTINGS_KEY, JSON.stringify(next.settings)],
      [EX_SETTINGS_KEY, JSON.stringify(next.exerciseSettings)],
      [GROUPS_KEY, JSON.stringify(next.groups)],
      [SESSIONS_KEY, JSON.stringify(next.sessions)],
      [BODYWEIGHT_KEY, JSON.stringify(next.bodyweights)],
    ]);
    if (get().countdown) cancelRestAlert();
    set({ ...next, countdown: null, viewDate: todayKey() });
  },

  setRestSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, rest: { ...DEFAULT_REST, ...s.settings.rest, ...patch } } }));
    markDirty(SETTINGS_KEY);
  },

  startCountdown: (seconds, label, kind = 'timer') =>
    set((s) => ({ countdown: beginCountdown(seconds, label, { ...DEFAULT_REST, ...s.settings.rest }.notify, kind) })),

  adjustCountdown: (seconds) =>
    set((s) => {
      if (!s.countdown) return {};
      const endsAt = Math.max(Date.now() + 1000, s.countdown.endsAt + seconds * 1000);
      const countdown = { ...s.countdown, endsAt, duration: Math.max(1, s.countdown.duration + seconds) };
      if ({ ...DEFAULT_REST, ...s.settings.rest }.notify) scheduleRestAlert(endsAt, countdown.label, countdown.kind);
      return { countdown };
    }),

  stopCountdown: () => {
    cancelRestAlert();
    set({ countdown: null });
  },

  setTimerSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, timer: { ...DEFAULT_TIMER, ...s.settings.timer, ...patch } } }));
    markDirty(SETTINGS_KEY);
  },

  setUnit: (unit) => {
    set((s) => ({ settings: { ...s.settings, unit } }));
    markDirty(SETTINGS_KEY);
  },
}));

// ---------- selectors / derived data ----------

export function useDay(date: string): Entry[] {
  return useStore((s) => s.days[date] ?? EMPTY);
}

/** All moves (built-in + the user's own, with group changes applied), and a lookup by id. */
export function useExercises() {
  const custom = useStore((s) => s.customExercises);
  const overrides = useStore((s) => s.exerciseSettings);
  return useMemo(() => {
    const all = [...custom, ...BUILTIN_EXERCISES].map((e) => {
      const o = overrides[e.id];
      if (!o) return e;
      const group = o.group && o.group !== e.group ? o.group : e.group;
      const kind = o.kind && o.kind !== (e.kind ?? 'weight') ? o.kind : e.kind;
      return group === e.group && kind === e.kind ? e : { ...e, group, kind };
    });
    const byId = new Map(all.map((e) => [e.id, e]));
    return { all, byId };
  }, [custom, overrides]);
}

/** Muscle groups in order, and a lookup by id. */
export function useGroups() {
  const groups = useStore((s) => s.groups);
  return useMemo(() => ({ groups, groupById: new Map(groups.map((g) => [g.id, g])) }), [groups]);
}

/** Rest time in seconds for a move: its own preset, else the default. */
/** Whether warm-up sets are on for a move. */
export function useWarmupOn(exerciseId: string): boolean {
  return useStore((s) => !!s.exerciseSettings[exerciseId]?.warmup);
}

/** The warm-up steps (percent of top weight × reps). */
export function useWarmupSteps(): WarmupStep[] {
  return useStore((s) => s.settings.warmup) ?? DEFAULT_WARMUP;
}

export function useRestSeconds(exerciseId: string): { seconds: number; custom: boolean } {
  const own = useStore((s) => s.exerciseSettings[exerciseId]?.rest);
  const fallback = useStore((s) => (s.settings.rest ?? DEFAULT_REST).seconds);
  return { seconds: own ?? fallback, custom: own != null };
}

/** Bar weight used for plate math on this move, or null if it doesn't use a bar. */
export function useBar(exercise: Exercise | undefined): number | null {
  const unit = useStore((s) => s.settings.unit);
  const override = useStore((s) => (exercise ? s.exerciseSettings[exercise.id]?.bar : undefined));
  if (override !== undefined) return override;
  return exercise?.bar ? BAR_WEIGHT[exercise.bar][unit] : null;
}

/** Plate sizes the user has, heaviest first. */
export function usePlates(): number[] {
  const unit = useStore((s) => s.settings.unit);
  const custom = useStore((s) => s.settings.plates?.[unit]);
  return custom ?? DEFAULT_PLATES[unit];
}

export function useSortedDates(): string[] {
  const days = useStore((s) => s.days);
  return useMemo(() => Object.keys(days).sort(), [days]);
}

/** The most recent earlier time this move was logged before `date`. */
export function findPrevious(
  days: Days,
  sortedDates: string[],
  exerciseId: string,
  date: string,
): { date: string; sets: WorkoutSet[] } | null {
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const d = sortedDates[i];
    if (d >= date) continue;
    const entry = days[d]?.find((e) => e.exerciseId === exerciseId);
    if (entry) return { date: d, sets: entry.sets };
  }
  return null;
}

export function isExerciseUsed(days: Days, exerciseId: string) {
  return Object.values(days).some((entries) => entries.some((e) => e.exerciseId === exerciseId));
}

export function formatWeight(w: number | null) {
  if (w == null) return '';
  return String(Math.round(w * 100) / 100);
}

/** "1:30" (or "1:02:05" past an hour) from seconds. */
export function formatClock(seconds: number | null | undefined) {
  if (seconds == null) return '';
  const t = Math.max(0, Math.round(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** A set in a few characters: "100 × 5", "+10 × 8", "12 reps", "1:30", "5 km · 25:00". */
export function formatSet(s: WorkoutSet, unit: Unit = 'kg') {
  if (s.distance != null || (s.time != null && s.reps == null && s.weight == null)) {
    const dist = s.distance != null ? `${formatWeight(s.distance)} ${unit === 'kg' ? 'km' : 'mi'}` : '';
    return [dist, s.time != null ? formatClock(s.time) : ''].filter(Boolean).join(' · ') || '—';
  }
  if (s.weight == null && s.reps == null) return '—';
  if (s.weight == null || s.weight === 0) return `${s.reps ?? 0} reps`;
  return `${formatWeight(s.weight)} × ${s.reps ?? 0}`;
}

/** The most recent body weight logged on or before `date`, if any. */
export function bodyweightOn(bodyweights: Record<string, number>, date: string): number | null {
  let best: string | null = null;
  for (const d of Object.keys(bodyweights)) if (d <= date && (!best || d > best)) best = d;
  return best ? bodyweights[best] : null;
}

/** Workouts per week to aim for (0 = no goal). */
export function useGoal(): number {
  return useStore((s) => (s.settings.goal ?? DEFAULT_GOAL).perWeek);
}
