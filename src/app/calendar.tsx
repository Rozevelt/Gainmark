import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { CalendarList } from 'react-native-calendars';
import type { CalendarListImperativeMethods } from 'react-native-calendars/src/calendar-list';
import type { MarkedDates } from 'react-native-calendars/src/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFor, Text } from '@/components/text';
import { showProgressed } from '@/components/toast';
import { formatMinutes } from '@/components/workout-timer';
import { Button, IconButton, ScreenHeader } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { agoLabel, longLabel, relativeLabel, todayKey } from '@/lib/dates';
import { dayGroups, movesCount } from '@/lib/summary';
import { formatSet, useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors, useIsDark } from '@/theme';

export default function CalendarScreen() {
  const c = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const viewDate = useStore((s) => s.viewDate);
  const setViewDate = useStore((s) => s.setViewDate);
  const copyWorkout = useStore((s) => s.copyWorkout);
  const deleteDay = useStore((s) => s.deleteDay);
  const days = useStore((s) => s.days);
  const unit = useStore((s) => s.settings.unit);
  const { byId } = useExercises();
  const { groupById } = useGroups();
  const sessions = useStore((s) => s.sessions);

  const [selected, setSelected] = useState(viewDate);
  const [month, setMonth] = useState(viewDate.slice(0, 7));
  // The month pages are as wide as the card (screen minus its margins and border).
  const { width } = useWindowDimensions();
  const calendarWidth = width - 32 - 2;
  const listRef = useRef<CalendarListImperativeMethods>(null);
  // Opened on the day being viewed; later months are swiped to, not re-mounted.
  const [startMonth] = useState(viewDate.slice(0, 7));

  // One dot per muscle group trained that day, in the group's colour.
  const marked = useMemo(() => {
    const m: MarkedDates = {};
    for (const d of Object.keys(days)) {
      m[d] = {
        dots: dayGroups(days[d], byId, groupById).map((g) => ({
          key: g.id,
          color: g.color,
          selectedDotColor: g.color,
        })),
      };
    }
    // A soft highlight (not solid lime) so the group dots stay visible on the selected day.
    m[selected] = { ...m[selected], selected: true, selectedColor: c.accentSoft, selectedTextColor: c.accent };
    return m;
  }, [days, selected, c, byId, groupById]);

  const monthDates = Object.keys(days).filter((d) => d.startsWith(month));
  const monthCount = monthDates.length;
  const selectedGroups = dayGroups(days[selected] ?? [], byId, groupById);
  const entries = days[selected] ?? [];
  const session = sessions[selected];
  const target = viewDate;
  const targetLabel = relativeLabel(target);
  const ago = agoLabel(selected);

  const openDay = (d: string) => {
    setViewDate(d);
    router.back();
  };

  // Copying only works onto an empty day.
  const hasWorkout = entries.length > 0 && selected !== target;
  const targetBusy = (days[target]?.length ?? 0) > 0;
  const canCopy = hasWorkout && !targetBusy;

  const copy = () => {
    showProgressed(copyWorkout(selected, target, 'replace'));
    setViewDate(target);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Calendar"
        subtitle={`${monthCount} ${monthCount === 1 ? 'workout' : 'workouts'} this month`}
        left={<IconButton name="back" label="Back" onPress={() => router.back()} />}
        right={
          selected !== todayKey() ? (
            <Button
              title="Today"
              variant="ghost"
              onPress={() => {
                setSelected(todayKey());
                setMonth(todayKey().slice(0, 7));
                listRef.current?.scrollToMonth(todayKey());
              }}
              style={{ paddingHorizontal: 10 }}
            />
          ) : null
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.calendarCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Months sit side by side: swipe left or right and the next month follows the finger. */}
          <CalendarList
            ref={listRef}
            key={`${isDark}-${c.accent}`}
            current={`${startMonth}-01`}
            horizontal
            pagingEnabled
            staticHeader
            calendarWidth={calendarWidth}
            calendarHeight={360}
            pastScrollRange={120}
            futureScrollRange={24}
            firstDay={1}
            markingType="multi-dot"
            markedDates={marked}
            onDayPress={(d) => setSelected(d.dateString)}
            onVisibleMonthsChange={(months) => {
              if (months[0]) setMonth(months[0].dateString.slice(0, 7));
            }}
            theme={{
              calendarBackground: c.surface,
              dayTextColor: c.text,
              textDisabledColor: c.textFaint,
              monthTextColor: c.text,
              textSectionTitleColor: c.textDim,
              arrowColor: c.accent,
              todayTextColor: c.accent,
              selectedDayBackgroundColor: c.accent,
              selectedDayTextColor: c.onAccent,
              dotColor: c.accent,
              dotStyle: { width: 5, height: 5, borderRadius: 3, marginTop: 1, marginHorizontal: 1 },
              textDayFontFamily: fontFor('600').fontFamily,
              textMonthFontFamily: fontFor('800').fontFamily,
              textMonthFontSize: 19,
              textDayHeaderFontFamily: fontFor('700').fontFamily,
            }}
          />
        </View>

        <View style={styles.panel}>
          <Text style={[styles.panelTitle, { color: c.text }]}>{longLabel(selected)}</Text>
          {selectedGroups.length ? (
            <View style={styles.groupChips}>
              {selectedGroups.map((g) => (
                <View key={g.id} style={[styles.groupChip, { borderColor: g.color }]}>
                  <View style={[styles.dot, { backgroundColor: g.color }]} />
                  <Text style={[styles.groupChipText, { color: c.text }]}>{g.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={[styles.panelMeta, { color: c.textDim }]}>
            {entries.length ? movesCount(entries) : 'Nothing logged'}
            {session?.end && session.logged ? `  ·  ⏱ ${formatMinutes(session.end - session.start)}` : ''}
            {ago ? `  ·  ${ago}` : ''}
          </Text>

          <View style={{ gap: 10, marginTop: 6 }}>
            {canCopy ? <Button title={`Copy to ${targetLabel}`} icon="copy" onPress={copy} /> : null}
            {entries.length ? (
              <Button
                title="Analyze workout"
                icon="chart"
                variant="secondary"
                onPress={() => router.push({ pathname: '/workout/[date]', params: { date: selected } })}
              />
            ) : null}
            {entries.length ? (
              <Button
                title="Delete workout"
                icon="delete"
                variant="danger"
                onPress={() =>
                  confirmAction(
                    'Delete workout?',
                    `All ${entries.length} ${entries.length === 1 ? 'move' : 'moves'} on ${longLabel(selected)} will be deleted, along with its workout time.`,
                    'Delete',
                    () => deleteDay(selected),
                  )
                }
              />
            ) : null}
            <Button
              title="Jump to this day"
              variant={canCopy ? 'secondary' : 'primary'}
              icon="calendar"
              onPress={() => openDay(selected)}
            />
          </View>
          {canCopy ? (
            <Text style={[styles.hint, { color: c.textFaint }]}>
              Copies every move and set with the same weights and reps, so you only change what improved.
            </Text>
          ) : hasWorkout && targetBusy ? (
            <Text style={[styles.hint, { color: c.textFaint }]}>
              {targetLabel} already has moves, so this workout can&apos;t be copied there. Copying only works onto an
              empty day.
            </Text>
          ) : null}
          {entries.length ? (
            <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.border }]}>
              {entries.map((e, i) => {
                const ex = byId.get(e.exerciseId);
                const group = ex ? groupById.get(ex.group) : undefined;
                return (
                  <View
                    key={e.id}
                    style={[
                      styles.listRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                    ]}>
                    <View style={styles.exNameRow}>
                      {group ? <View style={[styles.dot, { backgroundColor: group.color }]} /> : null}
                      <Text style={[styles.exName, { color: c.text }]}>{ex?.name ?? 'Deleted move'}</Text>
                    </View>
                    <Text style={[styles.exSets, { color: c.textDim }]}>
                      {e.sets.length ? e.sets.map((x) => formatSet(x, unit)).join('   ') : 'No sets'}
                      {e.sets.some((s) => s.weight) ? `  ${unit}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    marginHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  panel: { padding: 16, gap: 8 },
  panelTitle: { fontSize: 20, fontWeight: '800' },
  panelMeta: { fontSize: 14 },
  list: { borderRadius: radius.md, borderWidth: 1, marginTop: 6 },
  listRow: { paddingHorizontal: 14, paddingVertical: 11, gap: 3 },
  exName: { fontSize: 15, fontWeight: '700' },
  exSets: { fontSize: 14 },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  groupChipText: { fontSize: 13, fontWeight: '600' },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
