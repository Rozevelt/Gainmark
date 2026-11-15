import { create } from 'zustand';

import { addDays, fromKey, todayKey, toKey } from '@/lib/dates';
import { useStore } from '@/store/store';

export type CelebrationId = 'christmas' | 'newyear' | 'valentines' | 'easter' | 'midsummer' | 'halloween';

export type Celebration = {
  id: CelebrationId;
  name: string;
  emoji: string;
};

export const CELEBRATIONS: Record<CelebrationId, Celebration> = {
  christmas: { id: 'christmas', name: 'Christmas', emoji: '🎄' },
  newyear: { id: 'newyear', name: 'New Year', emoji: '🎆' },
  valentines: { id: 'valentines', name: "Valentine's", emoji: '❤️' },
  easter: { id: 'easter', name: 'Easter', emoji: '🐣' },
  midsummer: { id: 'midsummer', name: 'Midsummer', emoji: '☀️' },
  halloween: { id: 'halloween', name: 'Halloween', emoji: '🎃' },
};

/** Easter Sunday for a year (the Gregorian "computus"). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toKey(new Date(year, month - 1, day));
}

/** Finnish Midsummer (Juhannus): the Saturday between 20 and 26 June, and the Friday before it. */
function midsummerDays(year: number): string[] {
  for (let d = 20; d <= 26; d++) {
    const day = new Date(year, 5, d);
    if (day.getDay() === 6) return [addDays(toKey(day), -1), toKey(day)];
  }
  return [];
}

/** The holiday on a date, if any. */
export function celebrationOn(date: string): Celebration | null {
  const d = fromKey(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 12 && day >= 31) return CELEBRATIONS.newyear;
  if (m === 1 && day === 1) return CELEBRATIONS.newyear;
  if (m === 12 && day <= 26) return CELEBRATIONS.christmas;
  if (m === 2 && day >= 12 && day <= 14) return CELEBRATIONS.valentines;
  if (m === 10 && day >= 25) return CELEBRATIONS.halloween;
  const easter = easterSunday(y);
  if (date >= addDays(easter, -2) && date <= addDays(easter, 1)) return CELEBRATIONS.easter;
  if (midsummerDays(y).includes(date)) return CELEBRATIONS.midsummer;
  return null;
}

/** A holiday picked in Settings → Appearance to preview it; stays until tapped off or the app restarts (not saved). */
export const useCelebrationPreview = create<{
  preview: CelebrationId | null;
}>(() => ({ preview: null }));

/** Today's holiday (or the one being previewed), when holiday touches are on. */
export function useCelebration(): Celebration | null {
  const enabled = useStore((s) => s.settings.celebrations ?? true);
  const preview = useCelebrationPreview((s) => s.preview);
  if (preview) return CELEBRATIONS[preview];
  return enabled ? celebrationOn(todayKey()) : null;
}
