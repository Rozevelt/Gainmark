import type { Exercise } from '@/data/exercises';
import type { Group } from '@/data/groups';
import type { Entry } from '@/store/store';

/** The day's muscle groups, most-trained first. */
export function dayGroups(
  entries: Pick<Entry, 'exerciseId'>[],
  byId: Map<string, Exercise>,
  groupById: Map<string, Group>,
): Group[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const g = byId.get(e.exerciseId)?.group;
    if (g && groupById.has(g)) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => groupById.get(id)!);
}

/** "Legs · Core" — the day's main groups. */
export function groupSummary(
  entries: Pick<Entry, 'exerciseId'>[],
  byId: Map<string, Exercise>,
  groupById: Map<string, Group>,
  max = 3,
) {
  return dayGroups(entries, byId, groupById)
    .slice(0, max)
    .map((g) => g.name)
    .join(' · ');
}

export function movesCount(entries: Pick<Entry, 'sets'>[]) {
  const sets = entries.reduce((n, e) => n + e.sets.length, 0);
  return `${entries.length} ${entries.length === 1 ? 'move' : 'moves'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}
