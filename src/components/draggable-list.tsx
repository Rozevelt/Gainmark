import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
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
  onDragChange,
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
  onDragChange: (dragging: boolean) => void;
}) {
  const ids = data.map(keyOf);
  const layouts = useRef(new Map<string, Layout>());
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

  /** Move the held item to follow the finger and slide the others to make room. */
  function update() {
    const d = drag.current;
    if (!d) return;
    const dy = d.translation + (scrollY.current - d.startScroll);
    const held = layouts.current.get(d.id);
    const it = items.current.get(d.id);
    if (!held || !it) return;
    it.offset.value = dy;

    const center = held.y + held.h / 2 + dy;
    const others = ids.filter((id) => id !== d.id);
    const target = others.filter((id) => {
      const l = layouts.current.get(id);
      return l ? l.y + l.h / 2 < center : false;
    }).length;
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
      const next = Math.max(0, scrollY.current + speed);
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
    drag.current = {
      id,
      from,
      translation: 0,
      absoluteY: 0,
      startScroll: scrollY.current,
      target: from,
      shifts: new Map(),
    };
    items.current.get(id)?.setLifted(true);
    onDragChange(true);
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

  return (
    <View style={{ gap }}>
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
            {(gesture) => renderItem(item, gesture, { selected: selectedId === id, deselect })}
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
    scale.value = withSpring(up ? 1.03 : 1, { damping: 16, stiffness: 260 });
  }, [up, scale]);

  useEffect(() => {
    register({ offset, setLifted });
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gesture = usePanGesture({
    // Hold the handle to pick the card up; a quick swipe still scrolls.
    activateAfterLongPress: 300,
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
