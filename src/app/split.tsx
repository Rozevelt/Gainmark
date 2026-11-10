import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text, TextInput } from '@/components/text';
import { Toggle } from '@/components/toggle';
import { Button, Chip, IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { EMPTY_SPLIT, fromMondayFirst, SPLIT_TEMPLATES, WEEK_ORDER, WEEKDAY_NAMES, type SplitDay } from '@/data/splits';
import { confirmAction, notify } from '@/lib/confirm';
import { remindersSupported, requestReminderPermission } from '@/lib/reminders';
import { DEFAULT_REMINDER, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

function timeLabel(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function SplitScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const split = useStore((s) => s.settings.split) ?? EMPTY_SPLIT;
  const reminder = useStore((s) => s.settings.reminder) ?? DEFAULT_REMINDER;
  const setSplit = useStore((s) => s.setSplit);
  const setSplitDay = useStore((s) => s.setSplitDay);
  const setReminder = useStore((s) => s.setReminder);
  const { groups, groupById } = useGroups();
  const [open, setOpen] = useState<number | null>(null);
  const hasAnyDay = split.some(Boolean);

  const applyTemplate = (week: SplitDay[], name: string) => {
    const apply = () => {
      setSplit(fromMondayFirst(week).map((d) => (d ? { ...d, groups: d.groups.filter((g) => groupById.has(g)) } : null)));
      setOpen(null);
    };
    if (hasAnyDay) confirmAction('Use this split?', `Replace your week with ${name}?`, 'Replace', apply);
    else apply();
  };

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      setReminder({ enabled: false });
      return;
    }
    const granted = await requestReminderPermission();
    if (!granted) {
      notify('Notifications are off', 'Allow notifications for Gainmark in your phone settings to get reminders.');
      return;
    }
    setReminder({ enabled: true });
  };

  const shiftTime = (minutes: number) => {
    const total = (((reminder.hour * 60 + reminder.minute + minutes) % 1440) + 1440) % 1440;
    tick();
    setReminder({ hour: Math.floor(total / 60), minute: total % 60 });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Gym split"
        subtitle="Plan your week and get reminders"
        left={<IconButton name="back" label="Back" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.textDim }]}>START FROM A TEMPLATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {SPLIT_TEMPLATES.map((t) => (
                <Chip key={t.id} label={t.name} selected={false} onPress={() => applyTemplate(t.week, t.name)} />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.sectionTitle, { color: c.textDim }]}>YOUR WEEK</Text>
              {hasAnyDay ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => confirmAction('Clear split?', 'Set every day to rest?', 'Clear', () => setSplit(EMPTY_SPLIT))}>
                  <Text style={[styles.link, { color: c.textDim }]}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              {WEEK_ORDER.map((jsDay, i) => {
                const day = split[jsDay];
                const isOpen = open === jsDay;
                return (
                  <View
                    key={jsDay}
                    style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null}>
                    <Pressable
                      onPress={() => setOpen(isOpen ? null : jsDay)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.dayRow, pressed && { backgroundColor: c.surface2 }]}>
                      <Text style={[styles.weekday, { color: c.textDim }]}>{WEEKDAY_NAMES[jsDay].slice(0, 3)}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.dayName, { color: day ? c.text : c.textFaint }]}>
                          {day ? day.name || 'Workout' : 'Rest'}
                        </Text>
                        {day && day.groups.length ? (
                          <View style={styles.dots}>
                            {day.groups.map((g) => {
                              const group = groupById.get(g);
                              return group ? (
                                <View key={g} style={styles.dotItem}>
                                  <View style={[styles.dot, { backgroundColor: group.color }]} />
                                  <Text style={[styles.dotText, { color: c.textDim }]}>{group.name}</Text>
                                </View>
                              ) : null;
                            })}
                          </View>
                        ) : null}
                      </View>
                      <Icon name={isOpen ? 'close' : 'right'} size={18} color={c.textFaint} />
                    </Pressable>

                    {isOpen ? (
                      <View style={[styles.editor, { backgroundColor: c.surface2 }]}>
                        <TextInput
                          value={day?.name ?? ''}
                          onChangeText={(name) => setSplitDay(jsDay, { name, groups: day?.groups ?? [] })}
                          placeholder="Workout name, e.g. Legs"
                          placeholderTextColor={c.textFaint}
                          maxLength={24}
                          style={[styles.input, webNoOutline, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                        />
                        <View style={styles.groupChips}>
                          {groups.map((g) => {
                            const on = day?.groups.includes(g.id) ?? false;
                            return (
                              <Chip
                                key={g.id}
                                label={g.name}
                                dotColor={g.color}
                                selected={on}
                                onPress={() => {
                                  const current = day?.groups ?? [];
                                  const next = on ? current.filter((x) => x !== g.id) : [...current, g.id];
                                  // Name an unnamed day after its first group.
                                  const name = day?.name || (next[0] ? (groupById.get(next[0])?.name ?? '') : '');
                                  setSplitDay(jsDay, { name, groups: next });
                                }}
                              />
                            );
                          })}
                        </View>
                        {day ? (
                          <Button
                            title="Make it a rest day"
                            variant="secondary"
                            onPress={() => {
                              setSplitDay(jsDay, null);
                              setOpen(null);
                            }}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <Text style={[styles.note, { color: c.textFaint }]}>
              Tap a day to name it and pick its muscle groups. Gainmark shows the day&apos;s plan on the main screen.
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.textDim }]}>REMINDERS</Text>
            <View style={[styles.card, styles.reminderCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>Workout day reminders</Text>
                  <Text style={[styles.note, { color: c.textDim }]}>
                    A notification on each training day, e.g. “Legs day 💪”. None on rest days.
                  </Text>
                </View>
                <Toggle
                  value={reminder.enabled}
                  disabled={!remindersSupported}
                  onValueChange={toggleReminders}
                />
              </View>
              {reminder.enabled ? (
                <View style={styles.timeRow}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>Time</Text>
                  <View style={[styles.timeStepper, { backgroundColor: c.surface2 }]}>
                    <IconButton name="minus" size={18} label="15 minutes earlier" onPress={() => shiftTime(-15)} />
                    <Text style={[styles.time, { color: c.text }]}>{timeLabel(reminder.hour, reminder.minute)}</Text>
                    <IconButton name="add" size={18} label="15 minutes later" onPress={() => shiftTime(15)} />
                  </View>
                </View>
              ) : null}
              {!remindersSupported ? (
                <Text style={[styles.note, { color: c.textFaint }]}>Reminders work in the phone app.</Text>
              ) : reminder.enabled && !hasAnyDay ? (
                <Text style={[styles.note, { color: c.textFaint }]}>Add training days above to get reminders.</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontSize: 13, fontWeight: '700' },
  chips: { gap: 8 },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  weekday: { width: 34, fontSize: 14, fontWeight: '700' },
  dayName: { fontSize: 16, fontWeight: '700' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dotItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotText: { fontSize: 12, fontWeight: '600' },
  editor: { padding: 12, gap: 12 },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontSize: 13, lineHeight: 18 },
  reminderCard: { padding: 14, gap: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeStepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 4 },
  time: { fontSize: 20, fontWeight: '800', minWidth: 70, textAlign: 'center' },
});
