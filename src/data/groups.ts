export type Group = {
  id: string;
  name: string;
  color: string;
  /** Groups the user made themselves (can be deleted). */
  custom?: boolean;
};

/** Colours a group can use. Each group must have a different one. */
export const GROUP_COLORS = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#F97316', // orange
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#F59E0B', // amber
  '#EC4899', // pink
  '#22C55E', // green
  '#EAB308', // yellow
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#D946EF', // fuchsia
  '#84CC16', // lime
  '#0EA5E9', // sky
  '#F43F5E', // rose
  '#A855F7', // purple
  '#B45309', // brown
  '#94A3B8', // slate
];

export const DEFAULT_GROUPS: Group[] = [
  { id: 'chest', name: 'Chest', color: '#EF4444' },
  { id: 'back', name: 'Back', color: '#3B82F6' },
  { id: 'shoulders', name: 'Shoulders', color: '#F97316' },
  { id: 'biceps', name: 'Biceps', color: '#8B5CF6' },
  { id: 'triceps', name: 'Triceps', color: '#06B6D4' },
  { id: 'forearms', name: 'Forearms', color: '#F59E0B' },
  { id: 'core', name: 'Core', color: '#EC4899' },
  { id: 'legs', name: 'Legs', color: '#22C55E' },
  { id: 'cardio', name: 'Cardio', color: '#14B8A6' },
];

/** Old per-muscle ids (before groups existed) → group id. */
export const LEGACY_MUSCLE_TO_GROUP: Record<string, string> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  abs: 'core',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  fullbody: 'legs',
  cardio: 'cardio',
};
