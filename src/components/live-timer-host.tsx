import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { requestReminderPermission } from '@/lib/reminders';
import { useStore } from '@/store/store';
import { useColors } from '@/theme';

import { hideLiveTimer, liveTimerAvailable, showLiveTimer } from '../../modules/live-timer';

/**
 * Keeps the lock-screen / notification-shade timer in step with the app: the rest timer while
 * it counts down, otherwise the running workout timer, otherwise nothing. Only one shows at a
 * time. Renders nothing itself.
 */
export function LiveTimerHost() {
  const c = useColors();
  const enabled = useStore((s) => s.settings.liveTimer ?? true);
  const countdown = useStore((s) => s.countdown);
  const sessions = useStore((s) => s.sessions);
  const days = useStore((s) => s.days);
  // Bumped to look again: when a countdown runs out, when the app comes back, after permission.
  const [tick, setTick] = useState(0);
  const asked = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!liveTimerAvailable) return;
    if (!enabled) {
      hideLiveTimer();
      return;
    }
    const now = Date.now();
    const running = Object.entries(sessions).find(([, s]) => !s.end);
    let shown = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (countdown && countdown.endsAt > now) {
      const rest = countdown.kind === 'rest';
      shown = showLiveTimer({
        title: rest ? (countdown.label ? `Rest · ${countdown.label}` : 'Rest') : 'Timer',
        text: rest ? 'Next set when this reaches zero' : 'Counting down',
        base: countdown.endsAt,
        countDown: true,
        color: c.accent,
        // Gone by itself when it runs out, even if the app is asleep.
        timeoutMs: countdown.endsAt - now,
      });
      // Then switch back to the workout timer.
      timer = setTimeout(() => setTick((t) => t + 1), countdown.endsAt - now + 300);
    } else if (running) {
      const [date, session] = running;
      const sets = (days[date] ?? []).flatMap((e) => e.sets);
      const done = sets.filter((x) => x.done).length;
      shown = showLiveTimer({
        title: 'Workout',
        text: sets.length ? `${done} of ${sets.length} sets done` : 'Timer running',
        base: session.start,
        countDown: false,
        color: c.accent,
        timeoutMs: 0,
      });
    } else {
      hideLiveTimer();
    }

    // Notifications are off: ask once, then try again.
    if (!shown && !asked.current) {
      asked.current = true;
      requestReminderPermission().then((granted) => {
        if (granted) setTick((t) => t + 1);
      });
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [enabled, countdown, sessions, days, c.accent, tick]);

  return null;
}
