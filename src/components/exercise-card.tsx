import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Stepper, tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { IconButton } from '@/components/ui';
import type { Exercise, MoveKind } from '@/data/exercises';
import { confirmAction } from '@/lib/confirm';
import { best1RM, bestScored, fmt, isCounted, plateMath, plateText, setScore } from '@/lib/stats';
import {
  DEFAULT_DISPLAY,
  formatClock,
  formatWeight,
  useBar,
  useGroups,
  usePlates,
  useStore,
  type Entry,
  type Unit,
  type WorkoutSet,
} from '@/store/store';
import { radius, useColors } from '@/theme';

type Props = {
  date: string;
  entry: Entry;
  exercise: Exercise | undefined;
  previous: { date: string; sets: WorkoutSet[] } | null;
  /** Best set score (see setScore) for this move on any earlier day (0 = never done). */
  prevBestSet: number;
  unit: Unit;
  /** Body weight used to score bodyweight sets. */
  bodyweight: number;
  /** Where this move sits in its superset, if it's in one. */
  superset?: 'first' | 'middle' | 'last';
  /** There's a move above to make a superset with. */
  canLinkUp?: boolean;
  /** Hold-and-drag gesture for reordering; attached to the move's name. */
  dragGesture?: PanGesture;
  /** The card is popped out (picked up): sets can be deleted and Done puts it down. */
  picked?: boolean;
  onPutDown?: () => void;
};

/** How much one tap of − / + changes the weight. */
const WEIGHT_STEP: Record<Unit, number> = { kg: 2.5, lb: 5 };

export function ExerciseCard({
  date,
  entry,
  exercise,
  previous,
  prevBestSet,
  unit,
  bodyweight,
  superset,
  canLinkUp = false,
  dragGesture,
  picked = false,
  onPutDown,
}: Props) {
  const c = useColors();
  const addSet = useStore((s) => s.addSet);
  const removeEntry = useStore((s) => s.removeEntry);
  const removeSet = useStore((s) => s.removeSet);
  const insertSet = useStore((s) => s.insertSet);
  const linkSuperset = useStore((s) => s.linkSuperset);
  const unlinkSuperset = useStore((s) => s.unlinkSuperset);
  const kind: MoveKind = exercise?.kind ?? 'weight';
  const isWeight = kind === 'weight';
  // Plates and 1RM only make sense for weight × reps moves.
  const barSetting = useBar(exercise);
  const bar = isWeight ? barSetting : null;

  // The last deleted set, kept for a few seconds so it can be undone.
  const [undo, setUndo] = useState<{ set: WorkoutSet; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );
  const deleteSet = (set: WorkoutSet, index: number) => {
    tick('light');
    removeSet(date, entry.id, set.id);
    setUndo({ set, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  };
  const display = useStore((s) => s.settings.display) ?? DEFAULT_DISPLAY;
  const { groupById } = useGroups();
  const group = exercise ? groupById.get(exercise.group) : undefined;
  const name = exercise?.name ?? 'Deleted move';
  // Checking every set checks off the whole move.
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done);

  const oneRM = best1RM(entry.sets).value;
  // PR = a set that beats every set of this move on earlier days (weight × reps, the most
  // reps with your body weight, the longest hold, the longest distance). The first time a
  // move is logged, its best set is the PR.
  const top = bestScored(entry.sets, kind, bodyweight);
  const prSetId = top.value > 0 && top.value > prevBestSet ? top.set?.id : undefined;
  const openTools = () => router.push({ pathname: '/move/[id]', params: { id: entry.exerciseId } });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: picked || allDone ? c.accent : c.border,
        },
      ]}>
      {/* Supersets: a line down the left joins the moves done together. */}
      {superset ? (
        <View
          style={[
            styles.supersetLine,
            {
              backgroundColor: c.accent,
              top: superset === 'first' ? 16 : -16,
              bottom: superset === 'last' ? 16 : -16,
            },
          ]}
        />
      ) : null}
      <View style={styles.cardHeader}>
        <DragHandle gesture={dragGesture} onTap={picked ? onPutDown : undefined}>
          <Text style={[styles.name, { color: c.text }]}>{name}</Text>
          <View style={styles.metaRow}>
            {group ? <View style={[styles.groupDot, { backgroundColor: group.color }]} /> : null}
            <Text style={[styles.meta, { color: c.textDim }]}>{group?.name ?? ''}</Text>
            {superset ? <Text style={[styles.meta, styles.supersetTag, { color: c.accent }]}>Superset</Text> : null}
          </View>
        </DragHandle>
        {picked && (entry.superset || canLinkUp) ? (
          // Popped out: join this move to the one above as a superset, or take it out of one.
          <Pressable
            onPress={() => {
              tick();
              if (entry.superset) unlinkSuperset(date, entry.id);
              else linkSuperset(date, entry.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={entry.superset ? 'Take out of superset' : 'Superset with the move above'}
            hitSlop={6}
            style={({ pressed }) => [styles.linkButton, { backgroundColor: c.surface2, opacity: pressed ? 0.75 : 1 }]}>
            <Icon name={entry.superset ? 'unlink' : 'link'} size={16} color={c.text} />
            <Text style={[styles.linkText, { color: c.text }]}>{entry.superset ? 'Unlink' : 'Superset'}</Text>
          </Pressable>
        ) : null}
        {picked ? (
          // Popped out: one button to put the card back down.
          <Pressable
            onPress={onPutDown}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => [styles.doneButton, { backgroundColor: c.accent, opacity: pressed ? 0.75 : 1 }]}>
            <Icon name="check" size={16} color={c.onAccent} />
            <Text style={[styles.doneText, { color: c.onAccent }]}>Done</Text>
          </Pressable>
        ) : (
          <>
            <IconButton name="calculator" size={20} color={c.textDim} label={`${name} tools`} onPress={openTools} />
            <IconButton
              name="delete"
              size={20}
              color={c.textFaint}
              label={`Remove ${name}`}
              onPress={() =>
                confirmAction('Remove move?', `${name} and its sets will be removed from this day.`, 'Remove', () =>
                  removeEntry(date, entry.id),
                )
              }
            />
          </>
        )}
      </View>

      {/* Estimated 1RM line: only when turned on in Settings. */}
      {display.oneRM && isWeight ? (
        <Pressable
          onPress={openTools}
          accessibilityRole="button"
          accessibilityLabel="Open 1RM calculator"
          style={({ pressed }) => [styles.stats, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
          <Text style={[styles.stat, { color: c.textDim }]}>
            1RM{' '}
            <Text style={[styles.statValue, { color: c.text }]}>
              {oneRM ? `~${fmt(Math.round(oneRM))} ${unit}` : '—'}
            </Text>
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.colSet, styles.th, { color: c.textFaint }]}>SET</Text>
        {kind === 'time' ? (
          <Text style={[styles.colWide, styles.th, { color: c.textFaint }]}>TIME</Text>
        ) : kind === 'cardio' ? (
          <>
            <Text style={[styles.colWeight, styles.th, { color: c.textFaint }]}>TIME</Text>
            <Text style={[styles.colReps, styles.th, { color: c.textFaint }]}>{unit === 'kg' ? 'KM' : 'MI'}</Text>
          </>
        ) : (
          <>
            {/* Bodyweight moves log added weight (minus = assisted). */}
            <Text style={[styles.colWeight, styles.th, { color: c.textFaint }]}>
              {kind === 'bodyweight' ? `+${unit.toUpperCase()}` : unit.toUpperCase()}
            </Text>
            <Text style={[styles.colReps, styles.th, { color: c.textFaint }]}>REPS</Text>
          </>
        )}
        <View style={styles.colCheck}>
          <Icon name="check" size={16} color={c.textFaint} />
        </View>
      </View>

      {/* While the card is popped out, each set's number becomes a delete button (Undo appears below). */}
      {entry.sets.map((s, i) => (
        <SetRow
          key={s.id}
          index={i}
          date={date}
          entryId={entry.id}
          set={s}
          prev={previous?.sets[i]}
          isPR={s.id === prSetId}
          kind={kind}
          bodyweight={bodyweight}
          unit={unit}
          bar={bar}
          editing={picked}
          onDelete={() => deleteSet(s, i)}
        />
      ))}

      {undo ? (
        <View style={[styles.undoBar, { backgroundColor: c.surface2 }]}>
          <Icon name="delete" size={16} color={c.textDim} />
          <Text style={[styles.undoText, { color: c.textDim }]}>Set {undo.index + 1} deleted</Text>
          <Pressable
            onPress={() => {
              tick();
              insertSet(date, entry.id, undo.set, undo.index);
              setUndo(null);
            }}
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={[styles.undoAction, { color: c.accent }]}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          tick();
          addSet(date, entry.id);
        }}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.addSet,
          {
            backgroundColor: pressed ? c.surface2 : 'transparent',
            borderColor: c.border,
          },
        ]}>
        <Icon name="add" size={18} color={c.accent} />
        <Text style={[styles.addSetText, { color: c.accent }]}>Add set</Text>
      </Pressable>
    </View>
  );
}

/**
 * The move's name area: hold it to pick the card up (and drag it). While picked up,
 * a tap puts it back down.
 */
function DragHandle({ gesture, onTap, children }: { gesture?: PanGesture; onTap?: () => void; children: ReactNode }) {
  const body = (
    <Pressable
      style={{ flex: 1 }}
      onPress={onTap}
      disabled={!onTap}
      accessibilityHint={gesture ? 'Hold to pick up and move' : undefined}>
      {children}
    </Pressable>
  );
  return gesture ? <GestureDetector gesture={gesture}>{body}</GestureDetector> : body;
}

function SetRow({
  index,
  date,
  entryId,
  set,
  prev,
  isPR,
  kind,
  bodyweight,
  unit,
  bar,
  editing,
  onDelete,
}: {
  index: number;
  date: string;
  entryId: string;
  set: WorkoutSet;
  prev: WorkoutSet | undefined;
  /** This set beats every earlier set of the move. */
  isPR: boolean;
  kind: MoveKind;
  bodyweight: number;
  unit: Unit;
  bar: number | null;
  /** The card is popped out: the set number becomes a one-tap delete button. */
  editing: boolean;
  onDelete: () => void;
}) {
  const c = useColors();
  const updateSet = useStore((s) => s.updateSet);
  const stepSet = useStore((s) => s.stepSet);
  const toggleSetDone = useStore((s) => s.toggleSetDone);

  // Green when this set beats the same set last time: more weight (or the same weight for more
  // reps); for timed and cardio moves, a longer time or distance.
  let improved = false;
  if (kind === 'time' || kind === 'cardio') {
    improved = !!prev && isCounted(set) && setScore(set, kind, bodyweight) > setScore(prev, kind, bodyweight);
  } else if (prev && set.reps != null && prev.reps != null) {
    const w = set.weight ?? 0;
    const pw = prev.weight ?? 0;
    if (kind === 'weight' && (set.weight == null || prev.weight == null)) improved = false;
    else improved = w > pw || (w === pw && set.reps > prev.reps);
  }
  const valueColor = improved ? c.success : c.text;
  const step = WEIGHT_STEP[unit];
  const plateSizes = usePlates();
  // "20 + 5 per side" under each set: only when turned on in Settings.
  const showPlates = useStore((s) => (s.settings.display ?? DEFAULT_DISPLAY).plates);
  const plates = showPlates && bar != null ? plateText(plateMath(set.weight, bar, plateSizes), bar, unit) : null;

  return (
    <View style={[styles.setBlock, { backgroundColor: set.done ? c.accentRow : c.surface }]}>
      <View style={styles.row}>
        <Pressable
          style={styles.colSet}
          onPress={editing ? onDelete : undefined}
          disabled={!editing}
          hitSlop={6}
          accessibilityRole={editing ? 'button' : undefined}
          accessibilityLabel={
            editing ? `Delete set ${index + 1}` : `Set ${index + 1}${isPR ? ', personal record' : ''}`
          }>
          {editing ? (
            <View style={[styles.setBadge, { backgroundColor: c.danger }]}>
              <Icon name="delete" size={16} color="#fff" />
            </View>
          ) : (
            <View style={[styles.setBadge, { backgroundColor: set.done ? c.accent : c.surface2 }]}>
              <Text style={[styles.setBadgeText, { color: set.done ? c.onAccent : c.textDim }]}>{index + 1}</Text>
              {/* PR: a small trophy on the badge's corner, so it takes no extra space. */}
              {isPR ? (
                <View style={[styles.prBadge, { backgroundColor: c.accent, borderColor: c.surface }]}>
                  <Icon name="trophy" size={10} color={c.onAccent} />
                </View>
              ) : null}
            </View>
          )}
        </Pressable>

        {kind === 'time' ? (
          // A hold: ±5 s per tap; type "90" or "1:30".
          <Stepper
            style={styles.colWide}
            mode="seconds"
            value={set.time ?? null}
            placeholder={prev?.time != null ? formatClock(prev.time) : '0:00'}
            color={valueColor}
            label="time"
            onChange={(time) => updateSet(date, entryId, set.id, { time })}
            onStep={(dir) => stepSet(date, entryId, set.id, 'time', dir * 5, prev?.time ?? null)}
          />
        ) : kind === 'cardio' ? (
          <>
            {/* ±1 min per tap; type "25" (minutes) or "25:30". */}
            <Stepper
              style={styles.colWeight}
              mode="minutes"
              value={set.time ?? null}
              placeholder={prev?.time != null ? formatClock(prev.time) : '0:00'}
              color={valueColor}
              label="time"
              onChange={(time) => updateSet(date, entryId, set.id, { time })}
              onStep={(dir) => stepSet(date, entryId, set.id, 'time', dir * 60, prev?.time ?? null)}
            />
            <Stepper
              style={styles.colReps}
              decimal
              value={set.distance ?? null}
              placeholder={prev?.distance != null ? formatWeight(prev.distance) : '0'}
              color={valueColor}
              label="distance"
              onChange={(distance) => updateSet(date, entryId, set.id, { distance })}
              onStep={(dir) => stepSet(date, entryId, set.id, 'distance', dir * 0.5, prev?.distance ?? null)}
            />
          </>
        ) : (
          <>
            <Stepper
              style={styles.colWeight}
              value={set.weight}
              decimal
              placeholder={prev?.weight != null ? formatWeight(prev.weight) : '0'}
              color={valueColor}
              label={kind === 'bodyweight' ? 'added weight' : 'weight'}
              onChange={(weight) => updateSet(date, entryId, set.id, { weight })}
              // Bodyweight moves can go below zero for assisted reps.
              onStep={(dir) =>
                stepSet(
                  date,
                  entryId,
                  set.id,
                  'weight',
                  dir * step,
                  prev?.weight ?? null,
                  kind === 'bodyweight' ? -500 : 0,
                )
              }
            />
            <Stepper
              style={styles.colReps}
              value={set.reps}
              placeholder={prev?.reps != null ? String(prev.reps) : '0'}
              color={valueColor}
              label="reps"
              onChange={(reps) => updateSet(date, entryId, set.id, { reps })}
              onStep={(dir) => stepSet(date, entryId, set.id, 'reps', dir, prev?.reps ?? null)}
            />
          </>
        )}

        <Pressable
          onPress={() => {
            tick('light');
            toggleSetDone(date, entryId, set.id);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!set.done }}
          accessibilityLabel={`Set ${index + 1} done`}
          hitSlop={4}
          style={styles.colCheck}>
          {/* Small rounded checkbox in the same style as the − / + boxes. */}
          <View
            style={[
              styles.check,
              set.done
                ? { backgroundColor: c.accent, borderColor: c.accent }
                : { backgroundColor: c.surface2, borderColor: c.border },
            ]}>
            {set.done ? <Icon name="check" size={16} color={c.onAccent} /> : null}
          </View>
        </Pressable>
      </View>

      {/* Plates per side under the set, only when turned on in Settings. */}
      {plates ? (
        <View style={styles.caption}>
          <Text style={[styles.captionText, { color: c.textDim }]} numberOfLines={1}>
            {plates}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Border width stays the same in every state so nothing shifts when a move is completed.
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 12,
    paddingTop: 10,
    gap: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 2 },
  name: { fontSize: 18, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  meta: { fontSize: 13, flexShrink: 1 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  stat: { fontSize: 13 },
  statValue: { fontSize: 13, fontWeight: '700' },
  headRow: { paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  th: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  colSet: { width: 30, alignItems: 'center' },
  colWeight: { flex: 1.25 },
  colReps: { flex: 1 },
  colWide: { flex: 2.25 },
  colCheck: { width: 34, alignItems: 'center' },
  // Set rows reach the card's edges (its 12px padding) so a checked set's highlight runs edge
  // to edge; the extra inner padding keeps the contents in place.
  setBlock: {
    marginHorizontal: -12,
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  doneText: { fontSize: 14, fontWeight: '800' },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  linkText: { fontSize: 14, fontWeight: '800' },
  // Sits in the page margin, left of the card, and reaches into the gaps between superset moves.
  supersetLine: { position: 'absolute', left: -11, width: 3, borderRadius: 2 },
  supersetTag: { fontWeight: '800' },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  undoText: { flex: 1, fontSize: 14, fontWeight: '600' },
  undoAction: { fontSize: 15, fontWeight: '800' },
  setBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBadge: {
    position: 'absolute',
    top: -6,
    right: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: { fontSize: 13, fontWeight: '700' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 16,
    gap: 8,
    marginTop: 3,
    marginLeft: 38,
    marginRight: 42,
  },
  captionText: { fontSize: 12, lineHeight: 16 },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    marginTop: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSetText: { fontSize: 15, fontWeight: '700' },
});
