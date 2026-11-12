import { useColorScheme } from 'react-native';

import { DEFAULT_THEME, useStore } from '@/store/store';

// Matches the app icon: neutral charcoal with a lime-green accent (the default).
const dark = {
  bg: '#111111',
  surface: '#1B1B1B',
  surface2: '#262626',
  border: '#303030',
  text: '#F5F5F5',
  textDim: '#A3A3A3',
  textFaint: '#666666',
  accent: '#AEF77F',
  accentSoft: 'rgba(174,247,127,0.13)',
  /** accentSoft over a card, as a solid colour (for rows that slide over other things). */
  accentRow: '#2E3828',
  onAccent: '#111111',
  success: '#AEF77F',
  danger: '#FF5A5F',
};

const light: typeof dark = {
  bg: '#F4F4F4',
  surface: '#FFFFFF',
  surface2: '#EBEBEB',
  border: '#DDDDDD',
  text: '#121212',
  textDim: '#5C5C5C',
  textFaint: '#9E9E9E',
  accent: '#3D8C1A',
  accentSoft: 'rgba(61,140,26,0.12)',
  accentRow: '#E8F1E4',
  onAccent: '#FFFFFF',
  success: '#3D8C1A',
  danger: '#E03A3E',
};

export type Colors = typeof dark;

/**
 * Accent colours to pick from in Settings → Appearance. Each has a bright version for the
 * dark theme and a deeper one that reads well on white.
 */
export const ACCENTS = [
  { id: 'lime', name: 'Lime', dark: '#AEF77F', light: '#3D8C1A' },
  { id: 'aqua', name: 'Aqua', dark: '#6EE7E0', light: '#0E7F79' },
  { id: 'blue', name: 'Blue', dark: '#8AB8FF', light: '#1F63C9' },
  { id: 'violet', name: 'Violet', dark: '#BBA6FF', light: '#6744D1' },
  { id: 'pink', name: 'Pink', dark: '#FF94C6', light: '#C02A72' },
  { id: 'orange', name: 'Orange', dark: '#FFB36B', light: '#BF560B' },
  { id: 'gold', name: 'Gold', dark: '#FFDD6E', light: '#9A7300' },
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `top` laid over `base` at `alpha`, as a solid hex colour. */
function mix(base: string, top: string, alpha: number) {
  const b = hexToRgb(base);
  const t = hexToRgb(top);
  return `#${b
    .map((v, i) => Math.round(v + (t[i] - v) * alpha))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

const cache = new Map<string, Colors>();

/** The full colour set for an accent, in dark or light. */
export function palette(accentId: string, isDark: boolean): Colors {
  const key = `${accentId}-${isDark}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = isDark ? dark : light;
  const a = ACCENTS.find((x) => x.id === accentId) ?? ACCENTS[0];
  const accent = isDark ? a.dark : a.light;
  const [r, g, b] = hexToRgb(accent);
  const soft = isDark ? 0.13 : 0.12;
  const colors: Colors =
    a.id === 'lime'
      ? base
      : {
          ...base,
          accent,
          accentSoft: `rgba(${r},${g},${b},${soft})`,
          accentRow: mix(base.surface, accent, soft),
          success: accent,
        };
  cache.set(key, colors);
  return colors;
}

/** Whether the app is dark: the chosen mode, or the phone's setting when it follows the system. */
export function useIsDark() {
  const system = useColorScheme();
  const mode = useStore((s) => (s.settings.theme ?? DEFAULT_THEME).mode);
  return mode === 'system' ? system !== 'light' : mode === 'dark';
}

export function useColors(): Colors {
  const isDark = useIsDark();
  const accent = useStore((s) => (s.settings.theme ?? DEFAULT_THEME).accent);
  return palette(accent, isDark);
}

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
