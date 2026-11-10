import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text, TextInput } from '@/components/text';
import { IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { movesInRange } from '@/lib/progress';
import { useProgressMove } from '@/lib/progress-pick';
import { useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/**
 * Choose the move to chart on Progress → Moves. Lists the moves logged in the period being
 * viewed, by muscle group, with search.
 */
export default function PickMoveScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { from, to, label, current } = useLocalSearchParams<{
    from: string;
    to: string;
    label?: string;
    current?: string;
  }>();
  const days = useStore((s) => s.days);
  const { byId } = useExercises();
  const { groups } = useGroups();
  const setMoveId = useProgressMove((s) => s.setMoveId);
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const moves = movesInRange(days, from, to)
      .map((m) => ({ ...m, ex: byId.get(m.id) }))
      .filter((m) => !q || (m.ex?.name ?? 'deleted move').toLowerCase().includes(q));
    const known = new Set(groups.map((g) => g.id));
    const out = groups
      .map((g) => ({
        key: g.id,
        title: g.name,
        color: g.color as string | undefined,
        data: moves.filter((m) => m.ex?.group === g.id).sort((a, b) => a.ex!.name.localeCompare(b.ex!.name)),
      }))
      .filter((s) => s.data.length > 0);
    // Moves that were deleted (or whose group is gone) still have history.
    const other = moves.filter((m) => !m.ex || !known.has(m.ex.group));
    if (other.length) out.push({ key: 'other', title: 'Other', color: undefined, data: other });
    return out;
  }, [days, from, to, byId, groups, query]);

  const pick = (id: string) => {
    tick();
    setMoveId(id);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Choose a move"
        subtitle={label}
        left={<IconButton name="close" label="Close" onPress={() => router.back()} />}
      />

      <View style={styles.searchWrap}>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Icon name="search" size={20} color={c.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search moves"
            placeholderTextColor={c.textFaint}
            style={[styles.searchInput, webNoOutline, { color: c.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <IconButton name="close" size={18} color={c.textFaint} label="Clear search" onPress={() => setQuery('')} />
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeaderRow, { backgroundColor: c.bg }]}>
            {section.color ? <View style={[styles.sectionDot, { backgroundColor: section.color }]} /> : null}
            <Text style={[styles.sectionHeader, { color: c.textDim }]}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const on = item.id === current;
          return (
            <Pressable
              onPress={() => pick(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: c.border },
                (pressed || on) && { backgroundColor: on ? c.accentSoft : c.surface },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
                  {item.ex?.name ?? 'Deleted move'}
                </Text>
                <Text style={[styles.rowMeta, { color: c.textDim }]}>
                  {item.count === 1 ? 'Done once' : `Done ${item.count} times`}
                </Text>
              </View>
              {on ? <Icon name="check" size={20} color={c.accent} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textDim }]}>
            {query ? `No moves match "${query.trim()}".` : 'No moves logged in this period.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 2,
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionDot: { width: 9, height: 9, borderRadius: 5 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  empty: { fontSize: 15, textAlign: 'center', padding: 24 },
});
