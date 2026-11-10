import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/text';
import { Icon } from '@/components/icon';
import { Button, Chip, IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { MOVE_KINDS } from '@/data/exercises';
import { shortLabel, todayKey } from '@/lib/dates';
import { useDay, useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

export default function AddExerciseScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const date = useStore((s) => s.viewDate);
  const addExercises = useStore((s) => s.addExercises);
  const dayEntries = useDay(date);
  const { all } = useExercises();
  const { groups, groupById } = useGroups();

  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);

  // When the user comes back from creating a move, select it for them.
  const custom = useStore((s) => s.customExercises);
  const [seenCustom, setSeenCustom] = useState(custom);
  if (custom !== seenCustom) {
    const added = custom.filter((e) => !seenCustom.includes(e)).map((e) => e.id);
    setSeenCustom(custom);
    if (added.length) setSelected((cur) => [...cur, ...added]);
  }

  const inWorkout = useMemo(() => new Set(dayEntries.map((e) => e.exerciseId)), [dayEntries]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = all.filter(
      (e) =>
        (groupFilter === 'all' || e.group === groupFilter) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          (groupById.get(e.group)?.name.toLowerCase().includes(q) ?? false)),
    );
    return groups
      .map((g) => ({ group: g, data: matches.filter((e) => e.group === g.id) }))
      .filter((s) => s.data.length > 0);
  }, [all, query, groupFilter, groups, groupById]);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Long-press a move to open its settings (group, bar, delete).
  const onLongPress = (id: string) => router.push({ pathname: '/move/[id]', params: { id } });

  const openNew = () =>
    router.push({
      pathname: '/new-exercise',
      params: { name: query.trim(), group: groupFilter === 'all' ? '' : groupFilter },
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Add moves"
        subtitle={date === todayKey() ? "To today's workout" : `To ${shortLabel(date)}`}
        left={<IconButton name="close" label="Close" onPress={() => router.back()} />}
        right={<Button title="New" icon="add" variant="ghost" onPress={openNew} style={{ paddingHorizontal: 10 }} />}
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
          {query ? <IconButton name="close" size={18} color={c.textFaint} label="Clear search" onPress={() => setQuery('')} /> : null}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          <Chip label="All" selected={groupFilter === 'all'} onPress={() => setGroupFilter('all')} />
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              dotColor={g.color}
              selected={groupFilter === g.id}
              onPress={() => setGroupFilter(g.id)}
              onLongPress={() => router.push({ pathname: '/group-edit', params: { id: g.id } })}
            />
          ))}
          <Chip label="+ Group" selected={false} onPress={() => router.push('/group-edit')} />
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        initialNumToRender={24}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (selected.length ? 96 : 24) }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeaderRow, { backgroundColor: c.bg }]}>
            <View style={[styles.sectionDot, { backgroundColor: section.group.color }]} />
            <Text style={[styles.sectionHeader, { color: c.textDim }]}>{section.group.name.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              onLongPress={() => onLongPress(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: c.border },
                (pressed || isSelected) && { backgroundColor: isSelected ? c.accentSoft : c.surface },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: c.text }]}>{item.name}</Text>
                <View style={styles.rowTags}>
                  {item.custom ? (
                    <Text style={[styles.tag, { color: c.accent, borderColor: c.accent }]}>YOUR MOVE</Text>
                  ) : null}
                  {item.kind && item.kind !== 'weight' ? (
                    <Text style={[styles.tagPlain, { color: c.textDim }]}>
                      {MOVE_KINDS.find((k) => k.id === item.kind)?.label}
                    </Text>
                  ) : null}
                  {inWorkout.has(item.id) ? (
                    <Text style={[styles.tagPlain, { color: c.textDim }]}>Already in this workout</Text>
                  ) : null}
                </View>
              </View>
              <View
                style={[
                  styles.check,
                  isSelected
                    ? { backgroundColor: c.accent, borderColor: c.accent }
                    : { borderColor: c.textFaint },
                ]}>
                {isSelected ? <Icon name="check" size={16} color={c.onAccent} /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.textDim }]}>
              {query ? `No moves match "${query.trim()}".` : 'No moves here yet.'}
            </Text>
            <Button
              title={query.trim() ? `Create "${query.trim()}"` : 'Create a move'}
              icon="add"
              variant="secondary"
              onPress={openNew}
            />
          </View>
        }
        ListFooterComponent={
          sections.length ? (
            <Text style={[styles.footer, { color: c.textFaint }]}>
              Can&apos;t find it? Tap New to add your own move. Long-press a move to change its group or bar,
              or delete one of your own. Long-press a group to edit it.
            </Text>
          ) : undefined
        }
      />

      {selected.length ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopColor: c.border }]}>
          <Button
            title={`Add ${selected.length} ${selected.length === 1 ? 'move' : 'moves'}`}
            icon="check"
            onPress={() => {
              addExercises(date, selected);
              router.back();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
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
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
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
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 4,
  },
  tagPlain: { fontSize: 12, marginTop: 3 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 24, gap: 16, alignItems: 'center' },
  emptyText: { fontSize: 15 },
  footer: { fontSize: 13, textAlign: 'center', padding: 24, lineHeight: 19 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
