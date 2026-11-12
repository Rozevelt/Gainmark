import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { ExerciseCard } from '@/components/exercise-card';
import { DraggableList } from '@/components/draggable-list';
import { REST_BAR_HEIGHT, RestTimerBar } from '@/components/rest-timer-bar';
import { showProgressed } from '@/components/toast';
import { WarmupCard } from '@/components/warmup-card';
import { WorkoutTimer } from '@/components/workout-timer';
import { Icon } from '@/components/icon';
import { Button, IconButton, ScreenHeader } from '@/components/ui';
import type { SplitDay } from '@/data/splits';
import { confirmAction } from '@/lib/confirm';
import { addDays, agoLabel, fromKey, longLabel, relativeLabel, shortLabel, todayKey } from '@/lib/dates';
import { bestSetBefore, NOMINAL_BODYWEIGHT } from '@/lib/stats';
import { dayGroups, groupSummary } from '@/lib/summary';
import {
  DEFAULT_TIMER,
  bodyweightOn,
  findPrevious,
  useDay,
  useExercises,
  useGroups,
  useSortedDates,
  useStore,
} from '@/store/store';
import { radius, useColors } from '@/theme';

// Days are pages in a horizontal list, one page per day from START onwards. Only the
// visible day and its neighbours are rendered, so dragging sideways shows the next or
// previous day sliding in under your finger.
const START = '2000-01-01';
const PAGE_COUNT = 365 * 50;
const START_MS = fromKey(START).getTime();
const pageOf = (date: string) => Math.round((fromKey(date).getTime() - START_MS) / 86400000);
const dateAt = (page: number) => addDays(START, page);

export default function DayScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const date = useStore((s) => s.viewDate);
  const setViewDate = useStore((s) => s.setViewDate);
  const isToday = date === todayKey();
  // First launch: show the welcome screen once the saved data has loaded.
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => !!s.settings.onboarded);
  useEffect(() => {
    if (ready && !onboarded) router.push('/welcome');
  }, [ready, onboarded]);

  const listRef = useRef<FlatList<number>>(null);
  const currentPage = useRef(pageOf(date));
  const [initialPage] = useState(() => pageOf(date));
  const pages = useMemo(() => Array.from({ length: PAGE_COUNT }, (_, i) => i), []);
  // While a move card is held, sideways scrolling pauses so the drag isn't stolen.
  const [dragging, setDragging] = useState(false);
  // While a card is popped out (rearranging), the day swipe is paused too.
  const [picking, setPicking] = useState(false);
  const pagerLocked = dragging || picking;

  // Pausing the swipe can catch the pager part-way between two days; settle it back on the day
  // whenever rearranging starts or stops.
  const wasLocked = useRef(pagerLocked);
  useEffect(() => {
    if (wasLocked.current === pagerLocked) return;
    wasLocked.current = pagerLocked;
    listRef.current?.scrollToIndex({ index: currentPage.current, animated: true });
  }, [pagerLocked]);

  // The day can also change from the arrows, the calendar or "Back to today":
  // scroll the pager there (sliding for the next/previous day, jumping for further).
  useEffect(() => {
    const page = pageOf(date);
    if (page === currentPage.current) return;
    const far = Math.abs(page - currentPage.current) > 1;
    currentPage.current = page;
    listRef.current?.scrollToIndex({ index: page, animated: !far });
  }, [date]);

  const goTo = (next: string) => setViewDate(next);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        left={
          <View style={styles.brand}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
            <Text style={[styles.brandText, { color: c.text }]}>Gainmark</Text>
          </View>
        }
        right={
          <>
            <IconButton compact name="add" label="Add moves" onPress={() => router.push('/add-exercise')} />
            <IconButton compact name="timer" label="Timer" onPress={() => router.push('/timer')} />
            <IconButton compact name="chart" label="Statistics" onPress={() => router.push('/progress')} />
            <IconButton compact name="calendar" label="Calendar" onPress={() => router.push('/calendar')} />
            <IconButton compact name="more" label="Settings" onPress={() => router.push('/settings')} />
          </>
        }
      />

      <View style={[styles.dayNav, { borderBottomColor: c.border }]}>
        <IconButton name="left" size={36} label="Previous day" onPress={() => goTo(addDays(date, -1))} />
        <Pressable
          style={styles.dayCenter}
          onPress={() => router.push('/calendar')}
          accessibilityRole="button"
          accessibilityHint="Opens the calendar">
          {/* Just the title and date, so the header is the same height every day. */}
          <Text style={[styles.dayTitle, { color: c.text }, !isToday && styles.dayTitleWithPill]} numberOfLines={1}>
            {relativeLabel(date)}
          </Text>
          <Text style={[styles.daySub, { color: c.textDim }]} numberOfLines={1}>
            {longLabel(date)}
          </Text>
          {/* On other days, a small "Today" pill sits beside the title (it takes no extra line). */}
          {!isToday ? (
            <Pressable
              onPress={() => goTo(todayKey())}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Back to today"
              style={({ pressed }) => [
                styles.todayPill,
                { backgroundColor: c.accentSoft, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Icon name="reset" size={14} color={c.accent} />
              <Text style={[styles.todayText, { color: c.accent }]}>Today</Text>
            </Pressable>
          ) : null}
        </Pressable>
        <IconButton name="right" size={36} label="Next day" onPress={() => goTo(addDays(date, 1))} />
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(page) => String(page)}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={initialPage}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        scrollEnabled={!pagerLocked}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          if (page === currentPage.current) return;
          currentPage.current = page;
          setViewDate(dateAt(page));
        }}
        renderItem={({ item }) => (
          <DayPage
            date={dateAt(item)}
            width={width}
            current={dateAt(item) === date}
            onDragChange={setDragging}
            onPickChange={setPicking}
          />
        )}
        style={{ flex: 1 }}
      />
      <RestTimerBar />
    </View>
  );
}

/** One day's moves (or its empty state), as a page of the day pager. */
function DayPage({
  date,
  width,
  current,
  onDragChange,
  onPickChange,
}: {
  date: string;
  width: number;
  /** This is the day on screen. */
  current: boolean;
  onDragChange: (dragging: boolean) => void;
  onPickChange: (picking: boolean) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const days = useStore((s) => s.days);
  const unit = useStore((s) => s.settings.unit);
  const entries = useDay(date);
  const sortedDates = useSortedDates();
  const { byId } = useExercises();
  const countdownOn = useStore((s) => !!s.countdown);
  const split = useStore((s) => s.settings.split);
  const plan = split?.some(Boolean) ? split[fromKey(date).getDay()] : undefined;
  const { groupById } = useGroups();
  const timerOn = useStore((s) => (s.settings.timer ?? DEFAULT_TIMER).enabled);
  const session = useStore((s) => s.sessions[date]);
  // Same rule as WorkoutTimer: shown once timed, or today when there are moves.
  const showTimer = timerOn && (!!session || (date === todayKey() && entries.length > 0));
  // While the workout is running, the timer row pins to the top as you scroll.
  const running = !!session && !session.end;
  const reorderEntries = useStore((s) => s.reorderEntries);
  const exerciseSettings = useStore((s) => s.exerciseSettings);
  const deleteDay = useStore((s) => s.deleteDay);
  const bodyweights = useStore((s) => s.bodyweights);
  // Bodyweight PRs use the last logged body weight (or a typical one until you log yours).
  const bodyweight = bodyweightOn(bodyweights, date) ?? NOMINAL_BODYWEIGHT[unit];
  // Where each move sits in its superset (supersets are runs of moves with the same id).
  const supersetPos = (i: number): 'first' | 'middle' | 'last' | undefined => {
    const id = entries[i]?.superset;
    if (!id) return undefined;
    const before = entries[i - 1]?.superset === id;
    const after = entries[i + 1]?.superset === id;
    return before && after ? 'middle' : before ? 'last' : after ? 'first' : undefined;
  };

  // Hold a move's name and drag the card to reorder. The list needs this page's scroll
  // view (to scroll while dragging), and scrolling pauses while a card is held.
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  // Visible height and content height of the page, so a dragged card stays on screen.
  const viewport = useRef({ height: 0, content: 0 });
  // While a card is dragged, the list drives the scrolling, so scroll events are ignored
  // (late events would pull the position back and make the card jitter).
  const draggingRef = useRef(false);

  return (
    <KeyboardAvoidingView style={{ width, flex: 1 }} behavior="padding">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 32 + (countdownOn ? REST_BAR_HEIGHT : 0),
          },
        ]}
        ref={scrollRef}
        onScroll={(e) => {
          if (!draggingRef.current) scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        onLayout={(e) => (viewport.current.height = e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => (viewport.current.content = h)}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEnabled={!dragging}
        stickyHeaderIndices={running ? [0] : undefined}>
        {running ? (
          // While a workout runs, only the timer pins: a small capsule at the top right, just
          // under the header. (The outer view is the pinned one; the layout lives on the inner one.)
          <View style={styles.timerPin} pointerEvents="box-none">
            <View style={styles.timerRow} pointerEvents="box-none">
              <WorkoutTimer date={date} hasMoves={entries.length > 0} />
            </View>
          </View>
        ) : null}
        {running && plan ? (
          // The plan pill shares the timer's line but scrolls away normally.
          <View style={styles.planBesideTimer} pointerEvents="none">
            <View style={[styles.planPill, { backgroundColor: c.surface2 }]}>
              {plan.groups.map((g) =>
                groupById.get(g) ? (
                  <View key={g} style={[styles.planDot, { backgroundColor: groupById.get(g)!.color }]} />
                ) : null,
              )}
              <Text style={[styles.planText, { color: c.text }]}>{plan.name || 'Workout'} day</Text>
            </View>
          </View>
        ) : null}
        {/* The day's plan and workout timer, at the top of the day (only when there's something to show). */}
        {!running && (plan || showTimer) ? (
          <View style={styles.dayPills}>
            {plan ? (
              <View style={[styles.planPill, { backgroundColor: c.surface2 }]}>
                {plan.groups.map((g) =>
                  groupById.get(g) ? (
                    <View key={g} style={[styles.planDot, { backgroundColor: groupById.get(g)!.color }]} />
                  ) : null,
                )}
                <Text style={[styles.planText, { color: c.text }]}>{plan.name || 'Workout'} day</Text>
              </View>
            ) : null}
            {showTimer ? <WorkoutTimer date={date} hasMoves={entries.length > 0} /> : null}
          </View>
        ) : null}
        {entries.length === 0 ? (
          <EmptyDay date={date} plan={plan} />
        ) : (
          <>
            <DraggableList
              data={entries}
              keyOf={(e) => e.id}
              gap={12}
              scrollRef={scrollRef}
              scrollY={scrollY}
              viewport={viewport}
              onDragChange={(d) => {
                draggingRef.current = d;
                setDragging(d);
                onDragChange(d);
              }}
              onPickChange={onPickChange}
              active={current}
              onReorder={(ids) => reorderEntries(date, ids)}
              renderItem={(entry, drag, pick) => {
                const ex = byId.get(entry.exerciseId);
                const kind = ex?.kind ?? 'weight';
                const i = entries.indexOf(entry);
                return (
                  // A move's warm-up card sits right above it and moves with it.
                  <View style={{ gap: 12 }}>
                    {kind === 'weight' && exerciseSettings[entry.exerciseId]?.warmup ? (
                      <WarmupCard date={date} entry={entry} exercise={ex} unit={unit} locked={pick.rearranging} />
                    ) : null}
                    <ExerciseCard
                      date={date}
                      entry={entry}
                      exercise={ex}
                      previous={findPrevious(days, sortedDates, entry.exerciseId, date)}
                      prevBestSet={bestSetBefore(days, sortedDates, entry.exerciseId, date, kind, bodyweight)}
                      unit={unit}
                      bodyweight={bodyweight}
                      superset={supersetPos(i)}
                      canLinkUp={i > 0}
                      dragGesture={drag}
                      picked={pick.selected}
                      locked={pick.rearranging}
                      onPutDown={pick.deselect}
                    />
                  </View>
                );
              }}
            />
            <Button title="Add moves" icon="add" variant="secondary" onPress={() => router.push('/add-exercise')} />
            <Button
              title="Analyze workout"
              icon="chart"
              variant="ghost"
              onPress={() => router.push({ pathname: '/workout/[date]', params: { date } })}
            />
            <Button
              title="Save as workout"
              icon="bookmark"
              variant="ghost"
              onPress={() => router.push({ pathname: '/template-edit', params: { date } })}
            />
            <Button
              title="Delete workout"
              icon="delete"
              variant="danger"
              onPress={() =>
                confirmAction(
                  'Delete workout?',
                  `All ${entries.length} ${entries.length === 1 ? 'move' : 'moves'} and their sets on this day will be deleted, along with its workout time.`,
                  'Delete',
                  () => deleteDay(date),
                )
              }
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Most recent earlier workout whose muscle groups best match the planned ones. */
function findMatchingWorkout(
  plan: SplitDay | undefined,
  date: string,
  sortedDates: string[],
  groupsOf: (d: string) => string[],
): string | null {
  if (!plan || !plan.groups.length) return null;
  const want = new Set(plan.groups);
  let best: { date: string; score: number } | null = null;
  for (const d of sortedDates) {
    if (d >= date) continue;
    const have = groupsOf(d);
    const overlap = have.filter((g) => want.has(g)).length;
    const score = overlap / new Set([...have, ...want]).size;
    // Later dates win ties because the list is in date order.
    if (score >= 0.34 && (!best || score >= best.score)) best = { date: d, score };
  }
  return best?.date ?? null;
}

function EmptyDay({ date, plan }: { date: string; plan: SplitDay | undefined }) {
  const c = useColors();
  const days = useStore((s) => s.days);
  const copyWorkout = useStore((s) => s.copyWorkout);
  const templates = useStore((s) => s.templates);
  const startTemplate = useStore((s) => s.startTemplate);
  const sortedDates = useSortedDates();
  const { byId } = useExercises();
  const { groupById } = useGroups();

  const recent = useMemo(
    () =>
      sortedDates
        .filter((d) => d !== date)
        .slice(-5)
        .reverse(),
    [sortedDates, date],
  );
  const match = findMatchingWorkout(plan, date, sortedDates, (d) =>
    dayGroups(days[d], byId, groupById).map((g) => g.id),
  );
  // A saved workout with the same name as today's split day comes first.
  const planName = plan?.name?.trim().toLowerCase();
  const planTemplate = planName ? templates.find((t) => t.name.toLowerCase() === planName) : undefined;
  const saved = planTemplate ? [planTemplate, ...templates.filter((t) => t !== planTemplate)] : templates;

  return (
    <View style={{ gap: 20 }}>
      {plan ? (
        <View style={[styles.planCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textDim }]}>PLAN FOR THIS DAY</Text>
          <Text style={[styles.planTitle, { color: c.text }]}>{plan.name || 'Workout'} day</Text>
          <View style={styles.planGroups}>
            {plan.groups.map((g) => {
              const group = groupById.get(g);
              return group ? (
                <View key={g} style={[styles.planChip, { borderColor: group.color }]}>
                  <View style={[styles.planDot, { backgroundColor: group.color }]} />
                  <Text style={[styles.planChipText, { color: c.text }]}>{group.name}</Text>
                </View>
              ) : null;
            })}
          </View>
          {planTemplate ? (
            <Button
              title={`Start ${planTemplate.name}`}
              icon="bookmark"
              onPress={() => startTemplate(planTemplate.id, date)}
            />
          ) : null}
          {match ? (
            <Button
              title={`Copy last ${plan.name || 'workout'} (${shortLabel(match)})`}
              icon="copy"
              variant={planTemplate ? 'secondary' : 'primary'}
              onPress={() => showProgressed(copyWorkout(match, date, 'append'))}
            />
          ) : planTemplate ? null : (
            <Text style={[styles.emptyBody, { color: c.textDim, textAlign: 'left' }]}>
              No earlier {plan.name || 'matching'} workout yet. Add moves to start one.
            </Text>
          )}
        </View>
      ) : null}
      <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}>
          <Icon name="dumbbell" size={32} color={c.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.text }]}>No workout logged</Text>
        <Text style={[styles.emptyBody, { color: c.textDim }]}>
          Add moves from the library, or copy an earlier workout and update the weights and reps.
        </Text>
        <View style={styles.emptyButtons}>
          <Button title="Add moves" icon="add" onPress={() => router.push('/add-exercise')} />
          <Button
            title="Copy a past workout"
            icon="copy"
            variant="secondary"
            onPress={() => router.push('/calendar')}
          />
        </View>
      </View>

      {saved.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: c.textDim }]}>SAVED WORKOUTS</Text>
          {saved.map((t) => {
            const groups = dayGroups(t.entries, byId, groupById);
            return (
              <View key={t.id} style={[styles.recentRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.recentTitleRow}>
                    {groups.map((g) => (
                      <View key={g.id} style={[styles.recentDot, { backgroundColor: g.color }]} />
                    ))}
                    <Text style={[styles.recentTitle, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </View>
                  <Text style={[styles.recentMeta, { color: c.textDim }]} numberOfLines={1}>
                    {t.entries.length} {t.entries.length === 1 ? 'move' : 'moves'}
                    {groups.length ? ` · ${groups.map((g) => g.name).join(' · ')}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => startTemplate(t.id, date)}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${t.name}`}
                  style={({ pressed }) => [
                    styles.copyButton,
                    { backgroundColor: c.accentSoft, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <Icon name="play" size={16} color={c.accent} />
                  <Text style={[styles.copyText, { color: c.accent }]}>Start</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: c.textDim }]}>RECENT WORKOUTS</Text>
          {recent.map((d) => {
            const dayEntries = days[d];
            const ago = agoLabel(d);
            return (
              <View key={d} style={[styles.recentRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.recentTitleRow}>
                    {dayGroups(dayEntries, byId, groupById).map((g) => (
                      <View key={g.id} style={[styles.recentDot, { backgroundColor: g.color }]} />
                    ))}
                    <Text style={[styles.recentTitle, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
                      {groupSummary(dayEntries, byId, groupById) || 'Workout'}
                    </Text>
                  </View>
                  <Text style={[styles.recentMeta, { color: c.textDim }]} numberOfLines={1}>
                    {shortLabel(d)}
                    {ago ? ` · ${ago}` : ''} · {dayEntries.length} {dayEntries.length === 1 ? 'move' : 'moves'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => showProgressed(copyWorkout(d, date, 'append'))}
                  accessibilityRole="button"
                  accessibilityLabel={`Copy workout from ${shortLabel(d)}`}
                  style={({ pressed }) => [
                    styles.copyButton,
                    {
                      backgroundColor: c.accentSoft,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <Icon name="copy" size={16} color={c.accent} />
                  <Text style={[styles.copyText, { color: c.accent }]}>Copy</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// Gap between the header and the pinned timer, and the timer row's height (36px capsule + gap).
const TIMER_GAP = 8;
const TIMER_ROW = 36 + TIMER_GAP;

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  logo: { width: 34, height: 34, borderRadius: 9 },
  brandText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayCenter: { flex: 1, alignItems: 'center' },
  dayTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  // Leave room on both sides (to stay centred) for the Today pill.
  dayTitleWithPill: { paddingHorizontal: 68 },
  daySub: { fontSize: 13, marginTop: 1 },
  // The running timer: pinned at the top right, with a small gap under the header.
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: TIMER_ROW,
    paddingTop: TIMER_GAP,
  },
  // The pinned part. It sits flush with the top of the page, so when it pins it doesn't move:
  // the timer stays the same gap below the header.
  timerPin: { marginTop: -16 },
  // Sits on the timer's line (pulled up over it), centred like the plan pill normally is.
  planBesideTimer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: TIMER_ROW,
    paddingTop: TIMER_GAP,
    marginTop: -TIMER_ROW - 12,
  },
  dayPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -6,
    paddingTop: 4,
  },
  todayPill: {
    position: 'absolute',
    right: 0,
    top: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  todayText: { fontSize: 12, fontWeight: '800' },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
  },
  planDot: { width: 8, height: 8, borderRadius: 4 },
  planText: { fontSize: 12, fontWeight: '700', marginLeft: 2 },
  planCard: { borderRadius: radius.lg, borderWidth: 1, padding: 16, gap: 10 },
  planTitle: { fontSize: 22, fontWeight: '800' },
  planGroups: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  planChipText: { fontSize: 13, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  emptyButtons: { gap: 10, alignSelf: 'stretch', marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  recentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentDot: { width: 9, height: 9, borderRadius: 5 },
  recentTitle: { fontSize: 16, fontWeight: '700', marginLeft: 3 },
  recentMeta: { fontSize: 13, marginTop: 2 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
  },
  copyText: { fontSize: 14, fontWeight: '700' },
});
