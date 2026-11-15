import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

import { useStore } from '@/store/store';

const TAG = 'gainmark-workout';

/**
 * Keeps the screen on while a workout timer is running, so the phone hasn't locked when you
 * come back from a set. Can be switched off in Settings → Timers. Renders nothing.
 */
export function KeepAwakeHost() {
  const enabled = useStore((s) => s.settings.keepAwake ?? true);
  const running = useStore((s) => Object.values(s.sessions).some((x) => !x.end));

  useEffect(() => {
    if (!enabled || !running) return;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [enabled, running]);

  return null;
}
