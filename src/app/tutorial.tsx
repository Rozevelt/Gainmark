import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { radius, useColors, type Colors } from '@/theme';

/** `logo` shows the app icon instead of `icon`. */
type Slide = { icon: IconName; logo?: boolean; title: string; body: string; picture?: (c: Colors) => ReactNode };

/** A set row like the real ones: number, weight, reps, checkbox. */
function SetRowPicture(c: Colors) {
  return (
    <View style={[pic.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[pic.row, { backgroundColor: c.accentRow }]}>
        <View style={[pic.badge, { backgroundColor: c.accent }]}>
          <Text style={[pic.badgeText, { color: c.onAccent }]}>1</Text>
        </View>
        <View style={[pic.box, { backgroundColor: c.surface2 }]}>
          <Text style={[pic.minus, { color: c.textDim }]}>−</Text>
          <Text style={[pic.value, { color: c.text }]}>100</Text>
          <Text style={[pic.minus, { color: c.textDim }]}>+</Text>
        </View>
        <View style={[pic.box, { backgroundColor: c.surface2 }]}>
          <Text style={[pic.minus, { color: c.textDim }]}>−</Text>
          <Text style={[pic.value, { color: c.text }]}>8</Text>
          <Text style={[pic.minus, { color: c.textDim }]}>+</Text>
        </View>
        <View style={[pic.check, { backgroundColor: c.accent }]}>
          <Icon name="check" size={14} color={c.onAccent} />
        </View>
      </View>
    </View>
  );
}

/** A picked-up card: delete a set, add a drop set, superset with the move above. */
function PickedPicture(c: Colors) {
  return (
    <View style={[pic.card, { backgroundColor: c.surface, borderColor: c.accent }]}>
      <View style={pic.head}>
        <Text style={[pic.name, { color: c.text }]}>Bench Press</Text>
        <View style={[pic.pill, { backgroundColor: c.surface2 }]}>
          <Icon name="link" size={13} color={c.text} />
          <Text style={[pic.pillText, { color: c.text }]}>Superset</Text>
        </View>
        <View style={[pic.pill, { backgroundColor: c.accent }]}>
          <Icon name="check" size={13} color={c.onAccent} />
          <Text style={[pic.pillText, { color: c.onAccent }]}>Done</Text>
        </View>
      </View>
      <View style={pic.row}>
        <View style={[pic.badge, { backgroundColor: c.danger }]}>
          <Icon name="delete" size={13} color="#fff" />
        </View>
        <View style={[pic.box, { backgroundColor: c.surface2, opacity: 0.5 }]}>
          <Text style={[pic.value, { color: c.text }]}>80</Text>
        </View>
        <View style={[pic.box, { backgroundColor: c.surface2, opacity: 0.5 }]}>
          <Text style={[pic.value, { color: c.text }]}>10</Text>
        </View>
        <View style={[pic.check, pic.drop, { borderColor: c.accent, backgroundColor: c.accentSoft }]}>
          <Icon name="drop" size={14} color={c.accent} />
        </View>
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    icon: 'dumbbell',
    logo: true,
    title: 'Welcome to Gainmark',
    body: 'Gainmark is a workout log: you record your moves, sets, weights and reps for each day, and it tracks your progress. This guide shows where everything is.',
  },
  {
    icon: 'dumbbell',
    title: 'Adding moves and sets',
    body: 'Tap + at the top to add moves to the day. Set weight and reps with − and + or by typing. Tick the box on the right when a set is done.',
    picture: SetRowPicture,
  },
  {
    icon: 'calendar',
    title: 'Days',
    body: 'Swipe left or right, or use the arrows, to change day. Tap the date to open the calendar, where each day shows dots for the muscle groups trained.',
  },
  {
    icon: 'copy',
    title: 'Copying workouts',
    body: 'An empty day lets you copy a recent workout or start a saved one. To save a workout, tap Save as workout under its moves. Auto progression (Settings → Workouts) can raise weights and reps when you copy.',
  },
  {
    icon: 'drag',
    title: 'Editing a move',
    body: "Hold a move's name to pick the card up, then drag it to reorder. While it's picked up, the set number deletes a set, the arrow on the right adds a drop set, and Superset links it with the move above. Tap Done when finished.",
    picture: PickedPicture,
  },
  {
    icon: 'timer',
    title: 'Timers',
    body: 'Start workout at the top of the day times the session; Log saves the time. The timer button in the header starts a countdown. Rest and timer options are in Settings → Timers.',
  },
  {
    icon: 'chart',
    title: 'Statistics',
    body: "The chart button in the header opens Statistics: totals, trends, muscle groups, each move's history, your records and body weight. Swipe between the tabs. A trophy marks a set that beat your best.",
  },
];

/** A short swipeable intro to the app. Shown once after the welcome screen; replay it from Settings. */
export default function TutorialScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const finish = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const next = () => {
    if (last) return finish();
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.top}>
        <Text style={[styles.step, { color: c.textFaint }]}>
          {page + 1} / {SLIDES.length}
        </Text>
        {!last ? (
          <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.skip, { color: c.textDim }]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            {s.logo ? (
              <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
            ) : (
              <View style={[styles.iconCircle, { backgroundColor: c.accentSoft }]}>
                <Icon name={s.icon} size={44} color={c.accent} />
              </View>
            )}
            <Text style={[styles.title, { color: c.text }]}>{s.title}</Text>
            <Text style={[styles.body, { color: c.textDim }]}>{s.body}</Text>
            {s.picture ? <View style={styles.picture}>{s.picture(c)}</View> : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.title}
            style={[styles.dot, { backgroundColor: i === page ? c.accent : c.border, width: i === page ? 20 : 8 }]}
          />
        ))}
      </View>
      <View style={styles.bottom}>
        <Button title={last ? 'Done' : 'Next'} icon={last ? 'check' : 'right'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  step: { fontSize: 13, fontWeight: '700' },
  skip: { fontSize: 15, fontWeight: '700' },
  slide: { paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center', gap: 14 },
  logo: { width: 96, height: 96, borderRadius: 22 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
  picture: { alignSelf: 'stretch', marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 },
  dot: { height: 8, borderRadius: 4 },
  bottom: { paddingHorizontal: 20 },
});

const pic = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1.5, padding: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 16, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: radius.sm },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  box: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  minus: { fontSize: 16, fontWeight: '700' },
  value: { fontSize: 16, fontWeight: '700' },
  check: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  drop: { borderWidth: 1.5, borderStyle: 'dashed' },
});
