import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Toggle } from '@/components/toggle';
import { Icon, type IconName } from '@/components/icon';
import { Chip, IconButton, ScreenHeader } from '@/components/ui';
import { WEEK_ORDER } from '@/data/splits';
import { exportToFolder, pickImportFile, restoreData, shareExport, summarize, summaryText } from '@/lib/backup';
import { choose, notify } from '@/lib/confirm';
import { ALL_PLATES } from '@/lib/stats';
import { requestReminderPermission } from '@/lib/reminders';
import {
  DEFAULT_BACKUP,
  DEFAULT_DISPLAY,
  DEFAULT_REST,
  DEFAULT_TIMER,
  DEFAULT_WARMUP,
  useGoal,
  usePlates,
  useStore,
  useWarmupSteps,
  type Unit,
  type WarmupStep,
} from '@/store/store';
import { radius, useColors } from '@/theme';

export default function SettingsScreen() {
  const c = useColors();
  const unit = useStore((s) => s.settings.unit);
  const setUnit = useStore((s) => s.setUnit);
  const dayCount = useStore((s) => Object.keys(s.days).length);
  const groups = useStore((s) => s.groups);
  const plates = usePlates();
  const timer = useStore((s) => s.settings.timer) ?? DEFAULT_TIMER;
  const rest = useStore((s) => s.settings.rest) ?? DEFAULT_REST;
  const display = useStore((s) => s.settings.display) ?? DEFAULT_DISPLAY;
  const setDisplaySettings = useStore((s) => s.setDisplaySettings);
  const warmup = useWarmupSteps();
  const setWarmupSteps = useStore((s) => s.setWarmupSteps);
  const changeStep = (i: number, patch: Partial<WarmupStep>) =>
    setWarmupSteps(warmup.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const setRestSettings = useStore((s) => s.setRestSettings);
  const setTimerSettings = useStore((s) => s.setTimerSettings);
  const split = useStore((s) => s.settings.split);
  const reminderOn = useStore((s) => s.settings.reminder?.enabled ?? false);
  // "Push · Pull · Legs" — each workout name once, in week order.
  const splitSummary = [...new Set(WEEK_ORDER.map((d) => split?.[d]?.name).filter((n): n is string => !!n))].join(
    ' · ',
  );
  const setPlates = useStore((s) => s.setPlates);
  const backupOn = (useStore((s) => s.settings.backup) ?? DEFAULT_BACKUP).auto;
  const goal = useGoal();
  const setGoal = useStore((s) => s.setGoal);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="Settings" left={<IconButton name="back" label="Back" onPress={() => router.back()} />} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="UNITS">
          <Row label="Weight unit" last>
            <View style={[styles.segment, { backgroundColor: c.surface2 }]}>
              {(['kg', 'lb'] as Unit[]).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: unit === u }}
                  style={[styles.segmentItem, unit === u && { backgroundColor: c.accent }]}>
                  <Text style={[styles.segmentText, { color: unit === u ? c.onAccent : c.text }]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </Row>
        </Section>

        <Section title="TRAINING">
          <Pressable
            onPress={() => router.push('/split')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}>
            <View style={{ flex: 1, paddingVertical: 10 }}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Gym split</Text>
              <Text style={[styles.rowSub, { color: c.textDim }]} numberOfLines={1}>
                {splitSummary || 'Not set up yet'}
                {splitSummary && reminderOn ? '  ·  Reminders on' : ''}
              </Text>
            </View>
            <Icon name="right" size={20} color={c.textFaint} />
          </Pressable>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
            <View style={{ flex: 1, paddingVertical: 10 }}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Weekly goal</Text>
              <Text style={[styles.rowSub, { color: c.textDim }]}>
                {goal ? 'Workouts a week, for your streak' : 'Off'}
              </Text>
            </View>
            <View style={[styles.restStepper, { backgroundColor: c.surface2 }]}>
              <IconButton name="minus" size={18} label="Fewer workouts a week" onPress={() => setGoal(goal - 1)} />
              <Text style={[styles.restTime, { color: c.text }]}>{goal || 'Off'}</Text>
              <IconButton name="add" size={18} label="More workouts a week" onPress={() => setGoal(goal + 1)} />
            </View>
          </View>
        </Section>

        <Section title="WORKOUT TIMER">
          <Row label="Show workout timer">
            <Toggle value={timer.enabled} onValueChange={(enabled) => setTimerSettings({ enabled })} />
          </Row>
          <Row label="Start on first checked set" last>
            <Toggle
              value={timer.autoStart}
              disabled={!timer.enabled}
              onValueChange={(autoStart) => setTimerSettings({ autoStart })}
            />
          </Row>
        </Section>

        <Section title="MOVE CARDS">
          <Row label="Show estimated 1RM">
            <Toggle value={display.oneRM} onValueChange={(oneRM) => setDisplaySettings({ oneRM })} />
          </Row>
          <Row label="Show plates per side" last>
            <Toggle value={display.plates} onValueChange={(plates) => setDisplaySettings({ plates })} />
          </Row>
        </Section>

        <Section title="REST TIMER">
          <Row label="Start when a set is checked">
            <Toggle value={rest.autoStart} onValueChange={(autoStart) => setRestSettings({ autoStart })} />
          </Row>
          <Row label="Default rest">
            <View style={[styles.restStepper, { backgroundColor: c.surface2 }]}>
              <IconButton
                name="minus"
                size={18}
                label="Shorter default rest"
                onPress={() => setRestSettings({ seconds: Math.max(15, rest.seconds - 15) })}
              />
              <Text style={[styles.restTime, { color: c.text }]}>
                {Math.floor(rest.seconds / 60)}:{String(rest.seconds % 60).padStart(2, '0')}
              </Text>
              <IconButton
                name="add"
                size={18}
                label="Longer default rest"
                onPress={() => setRestSettings({ seconds: Math.min(600, rest.seconds + 15) })}
              />
            </View>
          </Row>
          <Row label="Notify when app is closed" last>
            <Toggle
              value={rest.notify}
              onValueChange={async (notify) => {
                if (notify && !(await requestReminderPermission())) return;
                setRestSettings({ notify });
              }}
            />
          </Row>
        </Section>

        <Section title="WARM-UP STEPS">
          <View style={styles.warmBox}>
            <Text style={[styles.platesNote, { color: c.textDim }]}>
              Used for moves with warm-up on. Each step is a percent of your top working weight.
            </Text>
            {warmup.map((w, i) => (
              <View key={i} style={styles.warmRow}>
                <Text style={[styles.warmLabel, { color: c.textDim }]}>W{i + 1}</Text>
                <View style={[styles.restStepper, { backgroundColor: c.surface2 }]}>
                  <IconButton
                    compact
                    name="minus"
                    size={16}
                    label={`Lower step ${i + 1} percent`}
                    onPress={() => changeStep(i, { pct: Math.max(5, w.pct - 5) })}
                  />
                  <Text style={[styles.warmValue, { color: c.text }]}>{w.pct}%</Text>
                  <IconButton
                    compact
                    name="add"
                    size={16}
                    label={`Raise step ${i + 1} percent`}
                    onPress={() => changeStep(i, { pct: Math.min(100, w.pct + 5) })}
                  />
                </View>
                <View style={[styles.restStepper, { backgroundColor: c.surface2 }]}>
                  <IconButton
                    compact
                    name="minus"
                    size={16}
                    label={`Fewer step ${i + 1} reps`}
                    onPress={() => changeStep(i, { reps: Math.max(1, w.reps - 1) })}
                  />
                  <Text style={[styles.warmValue, { color: c.text }]}>×{w.reps}</Text>
                  <IconButton
                    compact
                    name="add"
                    size={16}
                    label={`More step ${i + 1} reps`}
                    onPress={() => changeStep(i, { reps: Math.min(30, w.reps + 1) })}
                  />
                </View>
                {warmup.length > 1 ? (
                  <IconButton
                    name="delete"
                    size={18}
                    color={c.textFaint}
                    label={`Remove step ${i + 1}`}
                    onPress={() => setWarmupSteps(warmup.filter((_, j) => j !== i))}
                  />
                ) : null}
              </View>
            ))}
            <View style={styles.warmActions}>
              {warmup.length < 6 ? (
                <Pressable
                  onPress={() => {
                    const last = warmup[warmup.length - 1];
                    setWarmupSteps([...warmup, { pct: Math.min(100, (last?.pct ?? 40) + 10), reps: 1 }]);
                  }}
                  hitSlop={8}>
                  <Text style={[styles.warmLink, { color: c.accent }]}>+ Add step</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setWarmupSteps(DEFAULT_WARMUP)} hitSlop={8}>
                <Text style={[styles.warmLink, { color: c.textDim }]}>Reset to default</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title="PLATES">
          <View style={styles.platesBox}>
            <Text style={[styles.platesNote, { color: c.textDim }]}>
              Plate sizes you have. Plate math only uses these.
            </Text>
            <View style={styles.plateChips}>
              {ALL_PLATES[unit].map((p) => (
                <Chip
                  key={p}
                  label={`${p} ${unit}`}
                  selected={plates.includes(p)}
                  onPress={() => {
                    const next = plates.includes(p) ? plates.filter((x) => x !== p) : [...plates, p];
                    if (next.length)
                      setPlates(
                        unit,
                        next.sort((a, b) => b - a),
                      );
                  }}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section title="LIBRARY">
          <Pressable
            onPress={() => router.push('/groups')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}>
            <Text style={[styles.rowLabel, { color: c.text }]}>Muscle groups</Text>
            <View style={styles.groupDots}>
              {groups.slice(0, 8).map((g) => (
                <View key={g.id} style={[styles.groupDot, { backgroundColor: g.color }]} />
              ))}
              <Icon name="right" size={20} color={c.textFaint} />
            </View>
          </Pressable>
        </Section>

        <Section title="YOUR DATA">
          <Row label="Workouts logged" value={String(dayCount)} />
          <NavRow icon="download" label="Export data" sub="Save a file with all your workouts" onPress={exportData} />
          <NavRow icon="upload" label="Import data" sub="Load a Gainmark file" onPress={importData} />
          <NavRow
            icon="backup"
            label="Backups"
            sub={backupOn ? 'Daily, on this phone' : 'Daily backups are off'}
            onPress={() => router.push('/backups')}
            last
          />
        </Section>

        <Section title="ABOUT">
          <Row label="Gainmark" value={`v${Constants.expoConfig?.version ?? '1.0.0'}`} last />
        </Section>

        <Text style={[styles.note, { color: c.textFaint }]}>
          Workouts are saved on this phone. Export a file to keep a copy elsewhere.
        </Text>
      </ScrollView>
    </View>
  );
}

// ---------- export / import ----------

function exportData() {
  choose('Export data', 'A file with all your workouts, moves, groups and settings.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Share',
      onPress: () =>
        shareExport().catch(() => notify("Couldn't export", 'Something went wrong making the file. Try again.')),
    },
    {
      text: 'Save to phone',
      onPress: async () => {
        try {
          const name = await exportToFolder();
          if (name) notify('Exported', `Saved as ${name}.`);
        } catch {
          notify("Couldn't save", 'Something went wrong saving the file. Try another folder.');
        }
      },
    },
  ]);
}

async function importData() {
  let data;
  try {
    data = await pickImportFile();
  } catch (e) {
    notify("Can't import", e instanceof Error ? e.message : "This file couldn't be read.");
    return;
  }
  if (!data) return;
  choose(
    'Replace your data?',
    `This file has ${summaryText(summarize(data))} It replaces everything on this phone. What's there now is backed up first, so you can undo this in Backups.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        style: 'destructive',
        onPress: async () => {
          try {
            await restoreData(data);
            notify('Imported', 'Your data has been loaded.');
          } catch {
            notify("Couldn't import", 'Nothing was changed. Try again.');
          }
        },
      },
    ],
  );
}

function NavRow({
  icon,
  label,
  sub,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        styles.navRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        pressed && { backgroundColor: c.surface2 },
      ]}>
      <Icon name={icon} size={22} color={c.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: c.textDim }]}>{sub}</Text> : null}
      </View>
      <Icon name="right" size={20} color={c.textFaint} />
    </Pressable>
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

function Row({
  label,
  value,
  children,
  last,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
      {children ?? <Text style={[styles.rowValue, { color: c.textDim }]}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 22 },
  groupDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  platesBox: { padding: 14, gap: 10 },
  platesNote: { fontSize: 13 },
  plateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  card: { borderRadius: radius.md, borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  navRow: { justifyContent: 'flex-start', gap: 12, paddingVertical: 10 },
  rowSub: { fontSize: 13, marginTop: 2 },
  restStepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 2 },
  restTime: { fontSize: 17, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  warmBox: { padding: 14, gap: 10 },
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warmLabel: { width: 26, fontSize: 13, fontWeight: '800' },
  warmValue: { fontSize: 15, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  warmActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  warmLink: { fontSize: 14, fontWeight: '700' },
  rowValue: { fontSize: 16 },
  segment: { flexDirection: 'row', borderRadius: radius.sm, padding: 3 },
  segmentItem: { paddingHorizontal: 18, height: 32, borderRadius: 6, justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 13, textAlign: 'center' },
});
