import { requireOptionalNativeModule } from 'expo';

export type LiveTimerOptions = {
  title: string;
  text: string;
  /** Start time (counting up) or end time (counting down), ms since the epoch. */
  base: number;
  countDown: boolean;
  color: string;
  /** Remove the notification by itself after this many ms (0 = keep). */
  timeoutMs: number;
};

type LiveTimerNative = {
  show(options: LiveTimerOptions): boolean;
  hide(): boolean;
};

// Only in the installed app (Android); Expo Go and the web don't have it, and these do nothing there.
const native = requireOptionalNativeModule<LiveTimerNative>('LiveTimer');

export const liveTimerAvailable = native != null;

export function showLiveTimer(options: LiveTimerOptions): boolean {
  return native?.show(options) ?? false;
}

export function hideLiveTimer() {
  native?.hide();
}
