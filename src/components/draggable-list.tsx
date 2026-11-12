import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Dimensions, View, type ScrollViewInstance } from 'react-native';
import { usePanGesture, type PanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { tick } from '@/components/stepper';
import { radius, useColors } from '@/theme';

/** How close a dragged card may get to the top and bottom of the screen. */
const EDGE = 8;

function setRef<V>(ref: RefObject<V>, value: V) {
  ref.current = value;
}

type Layout = { y: number; h: number };
type ItemHandle = { offset: SharedValue<number>; setLifted: (lifted: boolean) => void };

type DragState = {
  id: string;
  from: number;
  translation: number;
  absoluteY: number;
  startScroll: number;
  target: number;
  shifts: Map<string, number>;
};

/** What an item needs to know about pick-up mode. */
export type PickState = {
  /** This item is popped out (picked up). */
  selected: boolean;
  /** Put the popped-out item back down where it is. */
  deselect: () => void;
  /** Some item in the list is popped out (rearranging): the cards' values are locked. */
  rearranging: boolean;
};

/**
 * A vertical list whose items can be dragged into a new order, in place.
 * Hold an item's handle and it pops out; drag it while holding (the others slide out of
 * the way, and the screen scrolls near the edges). It stays popped out after you let go,
 * until it's put down.
 */
export function DraggableList<T>({
  data,
  keyOf,
  renderItem,
  onReorder,
  gap,
  scrollRef,
  scrollY,
  viewport,
  onDragChange,
  onPickChange,
  active = true,
}: {
  data: T[];
  keyOf: (item: T) => string;
  /** `drag` is the gesture to attach to the item's handle (GestureDetector). */
  renderItem: (item: T, drag: PanGesture, pick: PickState) => ReactNode;
  onReorder: (ids: string[]) => void;
  gap: number;
  /** The ScrollView the list lives in, for auto-scrolling while dragging. */
  scrollRef: RefObject<ScrollViewInstance | null>;
  /** Current scroll offset of that ScrollView (kept up to date by the screen). */
  scrollY: RefObject<number>;
  /** That ScrollView's visible height and content height (kept up to date by the screen). */
  viewport: RefObject<{ height: number; content: number }>;
  onDragChange: (dragging: boolean) => void;
  /** Called when rearranging starts (an item pops out) and ends (it's put down). */
  onPickChange?: (picking: boolean) => void;
  /** False when the list isn't on screen (another day is showing): any popped-out item is put down. */
  active?: boolean;
}) {
  const c = useColors();
  const ids = data.map(keyOf);
  const layouts = useRef(new Map<string, Layout>());
  // Where the list starts inside the scroll view's content.
  const containerY = useRef(0);
  // While dragging, a dashed outline shows the slot the card will land in.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const slotTop = useSharedValue(0);
  const slotHeight = useSharedValue(0);
  const slotStyle = useAnimatedStyle(() => ({ top: slotTop.value, height: slotHeight.value }));
  const items = useRef(new Map<string, ItemHandle>());
  const drag = useRef<DragState | null>(null);
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetAfterReorder = useRef(false);
  // The popped-out item; it stays up until it's placed or put down.
  const [selected, setSelected] = useState<string | null>(null);
  const selectedId = selected && ids.includes(selected) ? selected : null;

  function stopAutoScroll() {
    if (autoScroll.current) clearInterval(autoScroll.current);
    autoScroll.current = null;
  }

  // After a drop the list re-renders in the new order; clear the slide offsets before it paints.
  useLayoutEffect(() => {
    if (!resetAfterReorder.current) return;
    resetAfterReorder.current = false;
    items.current.forEach((it) => (it.offset.value = 0));
  }, [data]);

  useEffect(() => () => stopAutoScroll(), []);

  const maxScroll = () => Math.max(0, viewport.current.content - viewport.current.height);

  /**
   * Keep the held card on screen (a little in from the top and bottom edges) and within the
   * list: it can't be dragged above the first move or below the last.
   */
  function clampOffset(held: Layout, dy: number) {
    const vh = viewport.current.height;
    if (vh > 0 && held.h < vh - EDGE * 2) {
      const top = containerY.current + held.y;
      dy = Math.max(dy, scrollY.current + EDGE - top);
      dy = Math.min(dy, scrollY.current + vh - EDGE - held.h - top);
    }
    let bottom = 0;
    for (const id of ids) {
      const l = layouts.current.get(id);
      if (l) bottom = Math.max(bottom, l.y + l.h);
    }
    dy = Math.max(dy, -held.y);
    dy = Math.min(dy, bottom - held.h - held.y);
    return dy;
  }

  /** Move the held item to follow the finger and slide the others to make room. */
  function update() {
    const d = drag.current;
    if (!d) return;
    const held = layouts.current.get(d.id);
    const it = items.current.get(d.id);
    if (!held || !it) return;
    const dy = clampOffset(held, d.translation + (scrollY.current - d.startScroll));
    it.offset.value = dy;

    const center = held.y + held.h / 2 + dy;
    const others = ids.filter((id) => id !== d.id);
    const target = others.filter((id) => {
      const l = layouts.current.get(id);
      return l ? l.y + l.h / 2 < center : false;
    }).length;
    if (target !== d.target) {
      // Move the landing outline to the new slot.
      let y = 0;
      for (const id of others.slice(0, target)) y += (layouts.current.get(id)?.h ?? 0) + gap;
      slotTop.set(withTiming(y, { duration: 160 }));
    }
    d.target = target;

    const step = held.h + gap;
    ids.forEach((id, j) => {
      if (id === d.id) return;
      let shift = 0;
      if (d.from < target && j > d.from && j <= target) shift = -step;
      if (d.from > target && j < d.from && j >= target) shift = step;
      if (d.shifts.get(id) !== shift) {
        d.shifts.set(id, shift);
        const other = items.current.get(id);
        if (other) other.offset.value = withTiming(shift, { duration: 160 });
      }
    });
  }

  function startAutoScroll() {
    stopAutoScroll();
    autoScroll.current = setInterval(() => {
      const d = drag.current;
      const sv = scrollRef.current;
      if (!d || !sv) return;
      const screenH = Dimensions.get('window').height;
      const topZone = 220;
      const bottomZone = screenH - 140;
      let speed = 0;
      if (d.absoluteY < topZone) speed = -Math.min(18, (topZone - d.absoluteY) / 6 + 4);
      else if (d.absoluteY > bottomZone) speed = Math.min(18, (d.absoluteY - bottomZone) / 6 + 4);
      if (!speed) return;
      // Never past the ends of the page, so the card and the scroll stay in step.
      const next = Math.min(maxScroll(), Math.max(0, scrollY.current + speed));
      if (next === scrollY.current) return;
      scrollY.current = next;
      sv.scrollTo({ y: next, animated: false });
      update();
    }, 16);
  }

  const start = (id: string) => {
    const from = ids.indexOf(id);
    if (from < 0) return;
    tick('light');
    setSelected(id);
    onDragChange(true);
    // A card that's partly off screen scrolls fully into view when it's picked up (a card
    // taller than the screen shows its top).
    const held = layouts.current.get(id);
    const sv = scrollRef.current;
    const vh = viewport.current.height;
    if (held && sv && vh > 0) {
      const top = containerY.current + held.y;
      let next = scrollY.current;
      if (held.h > vh - EDGE * 2 || top < next + EDGE) next = top - EDGE;
      else if (top + held.h > next + vh - EDGE) next = top + held.h - vh + EDGE;
      next = Math.min(maxScroll(), Math.max(0, next));
      if (next !== scrollY.current) {
        setRef(scrollY, next);
        sv.scrollTo({ y: next, animated: false });
      }
    }
    drag.current = {
      id,
      from,
      translation: 0,
      absoluteY: 0,
      startScroll: scrollY.current,
      target: from,
      shifts: new Map(),
    };
    if (held) {
      slotTop.set(held.y);
      slotHeight.set(held.h);
    }
    setDraggingId(id);
    items.current.get(id)?.setLifted(true);
    startAutoScroll();
  };

  const move = (id: string, translation: number, absoluteY: number) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    d.translation = translation;
    d.absoluteY = absoluteY;
    update();
  };

  const end = (id: string) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    stopAutoScroll();
    drag.current = null;
    setDraggingId(null);
    items.current.get(id)?.setLifted(false);
    onDragChange(false);
    // The item stays popped out (selected) after the finger lifts.
    if (d.target !== d.from) {
      const next = ids.filter((x) => x !== id);
      next.splice(d.target, 0, id);
      resetAfterReorder.current = true;
      tick('light');
      onReorder(next);
    } else {
      items.current.forEach((it) => (it.offset.value = withTiming(0, { duration: 160 })));
    }
  };

  const deselect = () => {
    tick();
    setSelected(null);
  };

  /**
   * Leave pick mode quietly: a card being dragged is dropped where it is now, and the
   * popped-out card is put down.
   */
  const putDown = () => {
    if (drag.current) end(drag.current.id);
    setSelected(null);
  };
  const putDownRef = useRef(putDown);
  useEffect(() => {
    putDownRef.current = putDown;
  });

  // Going to another screen (or another day) puts the card down where it is.
  useFocusEffect(useCallback(() => () => putDownRef.current(), []));
  useEffect(() => {
    if (!active) putDownRef.current();
  }, [active]);

  // Tell the screen when rearranging starts and stops (it pauses the day swipe meanwhile).
  const picking = selectedId != null;
  const onPickChangeRef = useRef(onPickChange);
  useEffect(() => {
    onPickChangeRef.current = onPickChange;
  });
  useEffect(() => {
    onPickChangeRef.current?.(picking);
  }, [picking]);
  useEffect(() => () => onPickChangeRef.current?.(false), []);

  return (
    <View style={{ gap }} onLayout={(e) => (containerY.current = e.nativeEvent.layout.y)}>
      {/* Where the dragged card will land: the gap the other cards leave for it. */}
      {draggingId ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              borderRadius: radius.lg,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: c.accent,
              backgroundColor: c.accentSoft,
            },
            slotStyle,
          ]}
        />
      ) : null}
      {data.map((item) => {
        const id = keyOf(item);
        return (
          <DragItem
            key={id}
            id={id}
            selected={selectedId === id}
            register={(handle) => items.current.set(id, handle)}
            unregister={() => items.current.delete(id)}
            onLayout={(l) => layouts.current.set(id, l)}
            onStart={start}
            onMove={move}
            onEnd={end}>
            {(gesture) => renderItem(item, gesture, { selected: selectedId === id, deselect, rearranging: picking })}
          </DragItem>
        );
      })}
    </View>
  );
}

function DragItem({
  id,
  selected,
  register,
  unregister,
  onLayout,
  onStart,
  onMove,
  onEnd,
  children,
}: {
  id: string;
  selected: boolean;
  register: (h: ItemHandle) => void;
  unregister: () => void;
  onLayout: (l: Layout) => void;
  onStart: (id: string) => void;
  onMove: (id: string, translation: number, absoluteY: number) => void;
  onEnd: (id: string) => void;
  children: (gesture: PanGesture) => ReactNode;
}) {
  const offset = useSharedValue(0);
  const scale = useSharedValue(1);
  const [lifted, setLifted] = useState(false);
  const up = lifted || selected;

  // Pop out a little while picked up.
  useEffect(() => {
    scale.value = withSpring(up ? 1.02 : 1, { damping: 16, stiffness: 260 });
  }, [up, scale]);

  useEffect(() => {
    register({ offset, setLifted });
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gesture = usePanGesture({
    // Hold the handle to pick the card up; a quick swipe still scrolls. Moving sideways before
    // the hold kicks in is a day swipe, so the pick-up is cancelled.
    activateAfterLongPress: 300,
    failOffsetX: [-12, 12],
    runOnJS: true,
    onActivate: () => onStart(id),
    onUpdate: (e) => onMove(id, e.translationY, e.absoluteY),
    onFinalize: () => onEnd(id),
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }, { scale: scale.value }] }));

  return (
    <Animated.View
      onLayout={(e) => onLayout({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
      style={[
        style,
        { zIndex: up ? 20 : 1 },
        up && {
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
      ]}>
      {children(gesture)}
    </Animated.View>
  );
}
