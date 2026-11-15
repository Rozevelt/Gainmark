import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, type GestureResponderHandlers } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/** How far (share of the page width) or how fast (px/ms) a swipe must go to change page. */
const DISTANCE = 0.25;
const VELOCITY = 0.6;
/** Movement before a swipe counts, and how clearly sideways it must be. */
const START = 14;
const SIDEWAYS = 1.8;

type Options = {
  /** Width of one page. */
  width: number;
  /** The page showing now. */
  getPage: () => number;
  count: number;
  /** Move the pager (to follow the finger, and to settle). Leave out for pagers that can only jump. */
  scrollTo?: (x: number, animated: boolean) => void;
  /** A swipe ended on `page` (it may be the same page). */
  onSwipe: (page: number) => void;
  enabled?: boolean;
};

/**
 * Paging by swipe for the web version. Browsers page on the slightest sideways nudge and let a
 * light flick fly on, which feels twitchy on iPhone. This only takes a clearly sideways swipe,
 * follows the finger, and changes at most one page: past a quarter of the width or with a quick
 * flick, otherwise it snaps back.
 *
 * Returns handlers for a View wrapping the pager (empty on Android/iOS native, which keep their own
 * paging). On the web the pager's own scrolling should be turned off (scrollEnabled={false}).
 */
export function useWebSwipe(options: Options): GestureResponderHandlers | Record<string, never> {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  // The ref is only read inside the gesture callbacks (on touch), never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const decide = (dx: number, dy: number) =>
      (opts.current.enabled ?? true) && Math.abs(dx) > START && Math.abs(dx) > Math.abs(dy) * SIDEWAYS;
    const clampX = (x: number) => {
      const { width, count } = opts.current;
      const max = (count - 1) * width;
      // A little give past the first and last page.
      if (x < 0) return x / 3;
      if (x > max) return max + (x - max) / 3;
      return x;
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => decide(g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => decide(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const { width, getPage, scrollTo } = opts.current;
        scrollTo?.(clampX(getPage() * width - g.dx), false);
      },
      onPanResponderRelease: (_, g) => {
        const { width, getPage, count, scrollTo, onSwipe } = opts.current;
        const page = getPage();
        let next = page;
        if (g.dx < -width * DISTANCE || g.vx < -VELOCITY) next = page + 1;
        else if (g.dx > width * DISTANCE || g.vx > VELOCITY) next = page - 1;
        next = Math.max(0, Math.min(count - 1, next));
        scrollTo?.(next * width, true);
        onSwipe(next);
      },
      onPanResponderTerminate: () => {
        const { width, getPage, scrollTo } = opts.current;
        scrollTo?.(getPage() * width, true);
      },
    });
  });

  return IS_WEB ? responder.panHandlers : {};
}

/** Whether the browser's own paging is replaced by useWebSwipe. */
export const webSwipe = IS_WEB;
