import { useColorScheme } from 'react-native';

// Matches the app icon: neutral charcoal with a lime-green accent.
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

// Lime is too pale on white, so light mode uses a deeper green from the same family.
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

export function useColors(): Colors {
  return useColorScheme() === 'light' ? light : dark;
}

export function useIsDark() {
  return useColorScheme() !== 'light';
}

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
