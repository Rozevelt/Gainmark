import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { Toggle } from '@/components/toggle';
import { Button, Chip, IconButton, ScreenHeader } from '@/components/ui';
import { BAR_WEIGHT, MOVE_KINDS } from '@/data/exercises';
import { confirmAction, notify } from '@/lib/confirm';
import { relativeLabel, shortLabel } from '@/lib/dates';
import { allTime1RM, best1RM, estimate1RM, fmt, ALL_PLATES, plateMath, plateText, roundToStep } from '@/lib/stats';
import {
  formatSet,
  isExerciseUsed,
  useBar,
  useDay,
  useExercises,
  useGroups,
  usePlates,
  useRestSeconds,
  useStore,
  useWarmupOn,
  useWarmupSteps,
  type Unit,
} from '@/store/store';
import { radius, useColors } from '@/theme';

const STEP: Record<Unit, number> = { kg: 2.5, lb: 5 };
const REST_PRESETS = [60, 90, 120, 180, 240];

/** 90 → "1:30", 120 → "2 min", 45 → "45 s". */
function restLabel(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}
/** Common bars, one tap to pick. EZ bars run about 4.5–7 kg. */
const QUICK_BARS: Record<Unit, { weight: number; label: string }[]> = {
  kg: [
    { weight: 20, label: 'Olympic' },
    { weight: 15, label: "Women's" },
    { weight: 10, label: 'Light' },
    { weight: 7, label: 'EZ' },
    { weight: 4.5, label: 'Short EZ' },
    { weight: 25, label: 'Trap' },
  ],
  lb: [
    { weight: 45, label: 'Olympic' },
    { weight: 35, label: "Women's" },
    { weight: 25, label: 'Light' },
    { weight: 15, label: 'EZ' },
    { weight: 10, label: 'Short EZ' },
    { weight: 55, label: 'Trap' },
  ],
};
/** Bar weight − / + step, fine enough to dial in any bar. */
const BAR_STEP: Record<Unit, number> = { kg: 0.5, lb: 1 };
/** % of 1RM and roughly how many reps that is. */
const PERCENTS: [number, number][] = [
  [100, 1],
  [95, 2],
  [90, 4],
  [85, 6],
  [80, 8],
  [75, 10],
  [70, 12],
  [65, 15],
  [60, 20],
];
// Standard competition plate colours, heaviest first (matches ALL_PLATES order).
const PLATE_COLORS = ['#E5393A', '#2F7FE0', '#F2C230', '#3DAA4E', '#F2F2F2', '#555A60', '#B9BDC2'];

export default function MoveToolsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { byId } = useExercises();
  const { groups, groupById } = useGroups();
  const exercise = byId.get(id);
  const group = exercise ? groupById.get(exercise.group) : undefined;
  const unit = useStore((s) => s.settings.unit);
  const date = useStore((s) => s.viewDate);
  const days = useStore((s) => s.days);
  const setBar = useStore((s) => s.setBar);
  const setExerciseGroup = useStore((s) => s.setExerciseGroup);
  const setExerciseKind = useStore((s) => s.setExerciseKind);
  const kind = exercise?.kind ?? 'weight';
  // Plates, bar, warm-ups and 1RM are for weight × reps moves only.
  const isWeight = kind === 'weight';
  const deleteExercise = useStore((s) => s.deleteExercise);
  const entry = useDay(date).find((e) => e.exerciseId === id);
  const bar = useBar(exercise);
  const rest = useRestSeconds(id);
  const warmupOn = useWarmupOn(id);
  const warmupSteps = useWarmupSteps();
  const setExerciseWarmup = useStore((s) => s.setExerciseWarmup);
  const setExerciseRest = useStore((s) => s.setExerciseRest);
  const plateSizes = usePlates();
  const step = STEP[unit];

  // The 1RM follows the best set of this move on the day being viewed. Changing the
  // numbers below switches to "your numbers" until reset.
  const bestSet = best1RM(entry?.sets ?? []).set;
  const [manual, setManual] = useState<{ weight: number | null; reps: number | null } | null>(null);
  const calcWeight = manual ? manual.weight : (bestSet?.weight ?? null);
  const calcReps = manual ? manual.reps : (bestSet?.reps ?? null);
  const oneRM = estimate1RM(calcWeight, calcReps);
  const record = allTime1RM(days, id);

  const heaviest = Math.max(0, ...(entry?.sets ?? []).map((s) => s.weight ?? 0));
  const [plateWeight, setPlateWeight] = useState<number | null>(
    heaviest || (bar != null ? bar + 2 * (unit === 'kg' ? 20 : 45) : null),
  );
  const defaultBar = exercise?.bar ? BAR_WEIGHT[exercise.bar][unit] : unit === 'kg' ? 20 : 45;
  const math = bar != null ? plateMath(plateWeight, bar, plateSizes) : null;
  const dayName = relativeLabel(date).toLowerCase() === 'today' ? 'today' : relativeLabel(date);

  const removeMove = () => {
    if (!exercise) return;
    if (isExerciseUsed(days, exercise.id)) {
      notify('Move is in use', `"${exercise.name}" is logged in a workout, so it can't be deleted.`);
      return;
    }
    confirmAction('Delete move?', `Delete your move "${exercise.name}"?`, 'Delete', () => {
      deleteExercise(exercise.id);
      router.back();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title={exercise?.name ?? 'Move'}
        subtitle={group?.name}
        left={<IconButton name="close" label="Close" onPress={() => router.back()} />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        {isWeight ? (
          <>
            {/* ---------- Plates ---------- */}
            <Section title="PLATES">
              {bar == null || !math ? (
                <Text style={[styles.note, { color: c.textDim }]}>
                  Turn on “Uses a bar” to see which plates to load.
                </Text>
              ) : (
                <>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.inputLabel, { color: c.textFaint }]}>TOTAL WEIGHT ({unit})</Text>
                    <Stepper
                      value={plateWeight}
                      decimal
                      label="total weight"
                      onChange={setPlateWeight}
                      onStep={(d) => setPlateWeight((w) => Math.max(0, (w ?? bar) + d * step))}
                    />
                  </View>
                  <PlateBar math={math} unit={unit} />
                  <Text style={[styles.plateText, { color: c.text }]}>
                    {plateText(math, bar, unit) ?? 'Enter a weight'}
                  </Text>
                  {math.kind === 'plates' ? (
                    <Text style={[styles.note, { color: c.textDim }]}>
                      {fmt(bar)} {unit} bar + {fmt(math.perSide)} {unit} on each side
                    </Text>
                  ) : null}
                </>
              )}
            </Section>

            {/* ---------- Bar ---------- */}
            <Section title="BAR">
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>Uses a bar</Text>
                  <Text style={[styles.note, { color: c.textDim }]}>
                    Weights you log include the bar. Used to work out plates.
                  </Text>
                </View>
                <Toggle value={bar != null} onValueChange={(on) => setBar(id, on ? defaultBar : null)} />
              </View>
              {bar != null ? (
                <>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.inputLabel, { color: c.textFaint }]}>BAR WEIGHT ({unit})</Text>
                    <Stepper
                      value={bar}
                      decimal
                      label="bar weight"
                      onChange={(v) => setBar(id, v ?? 0)}
                      onStep={(d) => setBar(id, Math.max(0, Math.round((bar + d * BAR_STEP[unit]) * 10) / 10))}
                    />
                  </View>
                  <View style={styles.chips}>
                    {QUICK_BARS[unit].map((b) => (
                      <Chip
                        key={b.weight}
                        label={`${b.label} ${fmt(b.weight)} ${unit}`}
                        selected={bar === b.weight}
                        onPress={() => setBar(id, b.weight)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </Section>

            {/* ---------- Warm-up ---------- */}
            <Section title="WARM-UP">
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>Warm-up sets</Text>
                  <Text style={[styles.note, { color: c.textDim }]}>
                    Adds a warm-up before this move: {warmupSteps.map((w) => `${w.pct}% × ${w.reps}`).join(', ')} of
                    your top working weight.
                  </Text>
                </View>
                <Toggle value={warmupOn} onValueChange={(on) => setExerciseWarmup(id, on)} />
              </View>
              <Pressable onPress={() => router.push('/settings-cards')} hitSlop={8}>
                <Text style={[styles.link, { color: c.accent }]}>Change warm-up steps in Settings</Text>
              </Pressable>
            </Section>
          </>
        ) : null}

        {/* ---------- Rest ---------- */}
        <Section title="REST BETWEEN SETS">
          <Text style={[styles.note, { color: c.textDim }]}>
            {rest.custom
              ? 'The rest timer uses this time after each set of this move.'
              : `Using your default (${restLabel(rest.seconds)}). Pick a time to give this move its own.`}
          </Text>
          <View style={styles.chips}>
            {REST_PRESETS.map((sec) => (
              <Chip
                key={sec}
                label={restLabel(sec)}
                selected={rest.custom && rest.seconds === sec}
                onPress={() => setExerciseRest(id, sec)}
              />
            ))}
          </View>
          <Stepper
            value={rest.seconds}
            label="rest seconds"
            onChange={(v) => setExerciseRest(id, v ?? undefined)}
            onStep={(d) => setExerciseRest(id, Math.max(15, rest.seconds + d * 15))}
          />
          {rest.custom ? (
            <Pressable onPress={() => setExerciseRest(id, undefined)} hitSlop={8}>
              <Text style={[styles.link, { color: c.accent }]}>Use the default rest time</Text>
            </Pressable>
          ) : null}
        </Section>

        {isWeight ? (
          <>
            {/* ---------- 1RM ---------- */}
            <Section title="ONE-REP MAX">
              <View style={[styles.result, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.resultLabel, { color: c.textDim }]}>Estimated 1RM</Text>
                <Text style={[styles.resultValue, { color: c.accent }]}>
                  {oneRM ? `${fmt(Math.round(oneRM * 10) / 10)} ${unit}` : '—'}
                </Text>
                <Text style={[styles.resultSource, { color: c.textDim }]}>
                  {manual
                    ? 'From the numbers you entered'
                    : bestSet
                      ? `From your best set ${dayName}: ${formatSet(bestSet)} ${unit}`
                      : `Log a set ${dayName} or enter numbers below`}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <View style={{ flex: 1.25, gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: c.textFaint }]}>WEIGHT ({unit})</Text>
                  <Stepper
                    value={calcWeight}
                    decimal
                    label="weight"
                    onChange={(weight) => setManual({ weight, reps: calcReps })}
                    onStep={(d) => setManual({ weight: Math.max(0, (calcWeight ?? 0) + d * step), reps: calcReps })}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: c.textFaint }]}>REPS</Text>
                  <Stepper
                    value={calcReps}
                    label="reps"
                    onChange={(reps) => setManual({ weight: calcWeight, reps })}
                    onStep={(d) => setManual({ weight: calcWeight, reps: Math.max(1, (calcReps ?? 0) + d) })}
                  />
                </View>
              </View>
              {manual && bestSet ? (
                <Pressable onPress={() => setManual(null)} hitSlop={8}>
                  <Text style={[styles.link, { color: c.accent }]}>Use my best set again</Text>
                </Pressable>
              ) : null}
              {record.value ? (
                <Text style={[styles.note, { color: c.textDim }]}>
                  All-time best estimate: {fmt(Math.round(record.value * 10) / 10)} {unit}
                  {record.date ? ` (${shortLabel(record.date)})` : ''}
                </Text>
              ) : null}

              {oneRM ? (
                <View style={[styles.table, { borderColor: c.border }]}>
                  <View style={[styles.tableRow, { backgroundColor: c.surface2 }]}>
                    <Text style={[styles.th, { color: c.textFaint }]}>% OF 1RM</Text>
                    <Text style={[styles.th, { color: c.textFaint }]}>WEIGHT</Text>
                    <Text style={[styles.th, { color: c.textFaint }]}>~REPS</Text>
                  </View>
                  {PERCENTS.map(([pct, reps], i) => (
                    <View
                      key={pct}
                      style={[
                        styles.tableRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                      ]}>
                      <Text style={[styles.td, { color: c.textDim }]}>{pct}%</Text>
                      <Text style={[styles.td, styles.tdStrong, { color: c.text }]}>
                        {fmt(roundToStep((oneRM * pct) / 100, unit))} {unit}
                      </Text>
                      <Text style={[styles.td, { color: c.textDim }]}>{reps}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.note, { color: c.textFaint }]}>
                Estimate using the Epley formula. Most accurate for sets of 10 reps or fewer.
              </Text>
            </Section>
          </>
        ) : null}

        {/* ---------- Type ---------- */}
        <Section title="TYPE">
          <View style={styles.chips}>
            {MOVE_KINDS.map((k) => (
              <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setExerciseKind(id, k.id)} />
            ))}
          </View>
          <Text style={[styles.note, { color: c.textDim }]}>{MOVE_KINDS.find((k) => k.id === kind)?.hint}</Text>
        </Section>

        {/* ---------- Group ---------- */}
        <Section title="MUSCLE GROUP">
          <View style={styles.chips}>
            {groups.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                dotColor={g.color}
                selected={exercise?.group === g.id}
                onPress={() => setExerciseGroup(id, g.id)}
              />
            ))}
          </View>
        </Section>

        {exercise?.custom ? (
          <Button title="Delete this move" icon="delete" variant="danger" onPress={removeMove} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionTitle, { color: c.textDim }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

/** Plate size in kg (pounds converted), used to size the drawing. */
function asKg(p: number, unit: Unit) {
  return unit === 'kg' ? p : p * 0.4536;
}

/** Big plates (10 kg and up) share one thickness; 5 kg is thinner; 2.5 and 1.25 thinnest. */
function plateShape(p: number, unit: Unit) {
  const kg = asKg(p, unit);
  if (kg >= 10) return { width: 34, height: kg >= 20 ? 150 : kg >= 15 ? 138 : 124, font: 14 };
  if (kg >= 4.5) return { width: 24, height: 96, font: 12 };
  return { width: 18, height: kg >= 2 ? 72 : 60, font: 10 };
}

/** One side of the bar, drawn with plates in competition colours. */
function PlateBar({ math, unit }: { math: ReturnType<typeof plateMath>; unit: Unit }) {
  const c = useColors();
  const plates = math.kind === 'plates' ? math.plates : [];
  const sizes = ALL_PLATES[unit];
  return (
    <View style={styles.plateBar}>
      <View style={[styles.shaft, { backgroundColor: c.textFaint }]} />
      <View style={[styles.collar, { backgroundColor: c.textDim }]} />
      {plates.map((p, i) => {
        const rank = sizes.indexOf(p);
        const { width, height, font } = plateShape(p, unit);
        const color = PLATE_COLORS[rank] ?? c.textDim;
        // Dark numbers on the light plates (yellow, white, silver).
        const ink = rank === 2 || rank === 4 || rank === 6 ? '#111' : '#fff';
        return (
          <View key={i} style={[styles.plate, { width, height, backgroundColor: color, borderColor: c.surface }]}>
            {/* A box as long as the plate is tall, turned upright and centred on the plate,
                so even the slim plates fit their number. */}
            <View style={[styles.plateLabelBox, { width: height - 8, height: font + 6 }]}>
              <Text numberOfLines={1} style={[styles.plateLabel, { color: ink, fontSize: font, lineHeight: font + 4 }]}>
                {fmt(p)}
              </Text>
            </View>
          </View>
        );
      })}
      <View style={[styles.sleeve, { backgroundColor: c.textFaint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 22 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, gap: 12 },
  calcRow: { flexDirection: 'row', gap: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  result: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 2 },
  resultLabel: { fontSize: 13, fontWeight: '600' },
  resultValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  resultSource: { fontSize: 13, textAlign: 'center' },
  link: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18 },
  table: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12 },
  th: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  td: { flex: 1, fontSize: 15 },
  tdStrong: { fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 164 },
  // The shaft shrinks first when a heavy load needs the room.
  shaft: { width: 56, minWidth: 12, flexShrink: 1, height: 14, borderRadius: 3 },
  collar: { width: 12, height: 40, borderRadius: 3 },
  plate: {
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  plateLabelBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transform: [{ rotate: '-90deg' }],
  },
  plateLabel: { fontWeight: '800', textAlign: 'center' },
  sleeve: { width: 44, height: 20, borderRadius: 3 },
  plateText: { fontSize: 18, fontWeight: '800' },
});
