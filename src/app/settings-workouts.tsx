import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { NavRow, PillStepper, Row, Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { Chip } from '@/components/ui';
import { WEEK_ORDER } from '@/data/splits';
import { DEFAULT_PROGRESSION, PROGRESSION_STEPS, PROGRESSION_STYLES, progressionStep } from '@/lib/progression';
import { ALL_PLATES } from '@/lib/stats';
import { useGoal, usePlates, useStore, type Unit } from '@/store/store';
import { useColors } from '@/theme';

/** Units, weekly goal, gym split and plates. */
export default function WorkoutSettings() {
  const c = useColors();
  const unit = useStore((s) => s.settings.unit);
  const setUnit = useStore((s) => s.setUnit);
  const goal = useGoal();
  const setGoal = useStore((s) => s.setGoal);
  const split = useStore((s) => s.settings.split);
  const reminderOn = useStore((s) => s.settings.reminder?.enabled ?? false);
  const plates = usePlates();
  const templateCount = useStore((s) => s.templates.length);
  const prog = { ...DEFAULT_PROGRESSION, ...useStore((s) => s.settings.progression) };
  const setProgression = useStore((s) => s.setProgression);
  const setPlates = useStore((s) => s.setPlates);
  // "Push · Pull · Legs" — each workout name once, in week order.
  const splitSummary = [...new Set(WEEK_ORDER.map((d) => split?.[d]?.name).filter((n): n is string => !!n))].join(
    ' · ',
  );

  return (
    <SettingsPage title="Workouts">
      <Section title="UNITS">
        <Row label="Weight unit" last>
          <View style={[settingsStyles.segment, { backgroundColor: c.surface2 }]}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                accessibilityRole="button"
                accessibilityState={{ selected: unit === u }}
                style={[settingsStyles.segmentItem, unit === u && { backgroundColor: c.accent }]}>
                <Text style={[settingsStyles.segmentText, { color: unit === u ? c.onAccent : c.text }]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </Section>

      <Section title="PLANNING">
        <Row label="Weekly goal" sub={goal ? 'Workouts a week, for your streak' : 'Off'}>
          <PillStepper
            value={goal ? String(goal) : 'Off'}
            onLess={() => setGoal(goal - 1)}
            onMore={() => setGoal(goal + 1)}
            lessLabel="Fewer workouts a week"
            moreLabel="More workouts a week"
          />
        </Row>
        <NavRow
          label="Gym split"
          sub={`${splitSummary || 'Not set up yet'}${splitSummary && reminderOn ? '  ·  Reminders on' : ''}`}
          onPress={() => router.push('/split')}
        />
        <NavRow
          label="Saved workouts"
          sub={templateCount ? `${templateCount} saved` : 'None yet'}
          onPress={() => router.push('/templates')}
          last
        />
      </Section>

      <Section title="AUTO PROGRESSION">
        <View style={settingsStyles.box}>
          <Text style={[settingsStyles.note, { color: c.textDim }]}>
            When you copy a past workout, the weights and reps move up for you. For weight and bodyweight moves.
          </Text>
          <View style={styles.chips}>
            {PROGRESSION_STYLES.map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                selected={prog.style === p.id}
                onPress={() => setProgression({ style: p.id })}
              />
            ))}
          </View>
          <Text style={[settingsStyles.note, { color: c.text }]}>
            {PROGRESSION_STYLES.find((p) => p.id === prog.style)?.hint}
          </Text>
        </View>
        {prog.style === 'double' || prog.style === 'dynamic' ? (
          <>
            <Row label="Rep range" sub={`${prog.repMin}–${prog.repMax} reps`}>
              <View style={{ gap: 6 }}>
                <PillStepper
                  compact
                  value={`${prog.repMin}`}
                  onLess={() => setProgression({ repMin: Math.max(1, prog.repMin - 1) })}
                  onMore={() => setProgression({ repMin: Math.min(prog.repMax - 1, prog.repMin + 1) })}
                  lessLabel="Lower bottom of the rep range"
                  moreLabel="Raise bottom of the rep range"
                />
                <PillStepper
                  compact
                  value={`${prog.repMax}`}
                  onLess={() => setProgression({ repMax: Math.max(prog.repMin + 1, prog.repMax - 1) })}
                  onMore={() => setProgression({ repMax: Math.min(50, prog.repMax + 1) })}
                  lessLabel="Lower top of the rep range"
                  moreLabel="Raise top of the rep range"
                />
              </View>
            </Row>
          </>
        ) : null}
        {prog.style !== 'off' ? (
          <Row label="Weight added" sub="Each time the weight goes up" last>
            <View style={styles.stepChips}>
              {PROGRESSION_STEPS[unit].map((st) => (
                <Chip
                  key={st}
                  label={`${st}`}
                  selected={progressionStep(prog, unit) === st}
                  onPress={() => setProgression({ step: st })}
                />
              ))}
            </View>
          </Row>
        ) : null}
      </Section>

      <Section title="PLATES">
        <View style={settingsStyles.box}>
          <Text style={[settingsStyles.note, { color: c.textDim }]}>
            Plate sizes you have. Plate math only uses these.
          </Text>
          <View style={styles.chips}>
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
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepChips: { flexDirection: 'row', gap: 6 },
});
