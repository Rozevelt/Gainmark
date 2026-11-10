/** One day of the weekly split. `null` means a rest day. */
export type SplitDay = { name: string; groups: string[] } | null;

/** Seven days indexed like Date.getDay(): 0 = Sunday … 6 = Saturday. */
export type Split = SplitDay[];

/** Week order shown in the app (Monday first), as Date.getDay() indexes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const push = { name: 'Push', groups: ['chest', 'shoulders', 'triceps'] };
const pull = { name: 'Pull', groups: ['back', 'biceps', 'forearms'] };
const legs = { name: 'Legs', groups: ['legs', 'core'] };
const upper = { name: 'Upper', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] };
const lower = { name: 'Lower', groups: ['legs', 'core'] };
const full = { name: 'Full body', groups: ['chest', 'back', 'shoulders', 'legs', 'core'] };

/** Ready-made splits, written Monday → Sunday. */
export const SPLIT_TEMPLATES: { id: string; name: string; week: SplitDay[] }[] = [
  { id: 'ppl', name: 'Push / Pull / Legs', week: [push, pull, legs, push, pull, legs, null] },
  { id: 'upper-lower', name: 'Upper / Lower', week: [upper, lower, null, upper, lower, null, null] },
  {
    id: 'bro',
    name: 'Bro split',
    week: [
      { name: 'Chest', groups: ['chest'] },
      { name: 'Back', groups: ['back'] },
      { name: 'Shoulders', groups: ['shoulders'] },
      { name: 'Arms', groups: ['biceps', 'triceps', 'forearms'] },
      { name: 'Legs', groups: ['legs', 'core'] },
      null,
      null,
    ],
  },
  { id: 'full', name: 'Full body ×3', week: [full, null, full, null, full, null, null] },
];

/** Convert a Monday-first week into a Date.getDay()-indexed split. */
export function fromMondayFirst(week: SplitDay[]): Split {
  const split: Split = [null, null, null, null, null, null, null];
  WEEK_ORDER.forEach((jsDay, i) => {
    const d = week[i];
    split[jsDay] = d ? { name: d.name, groups: [...d.groups] } : null;
  });
  return split;
}

export const EMPTY_SPLIT: Split = [null, null, null, null, null, null, null];
