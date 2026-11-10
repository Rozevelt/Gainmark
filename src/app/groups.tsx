import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Button, IconButton, ScreenHeader } from '@/components/ui';
import { GROUP_COLORS } from '@/data/groups';
import { useExercises, useGroups } from '@/store/store';
import { radius, useColors } from '@/theme';

export default function GroupsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { groups } = useGroups();
  const { all } = useExercises();
  const allColorsUsed = groups.length >= GROUP_COLORS.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Muscle groups"
        subtitle="Colours show as dots in the calendar"
        left={<IconButton name="back" label="Back" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {groups.map((g, i) => {
            const count = all.filter((e) => e.group === g.id).length;
            return (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: '/group-edit', params: { id: g.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  pressed && { backgroundColor: c.surface2 },
                ]}>
                <View style={[styles.swatch, { backgroundColor: g.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{g.name}</Text>
                  <Text style={[styles.meta, { color: c.textDim }]}>
                    {count} {count === 1 ? 'move' : 'moves'}
                    {g.custom ? '  ·  Your group' : ''}
                  </Text>
                </View>
                <Icon name="right" size={20} color={c.textFaint} />
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Add group"
          icon="add"
          disabled={allColorsUsed}
          onPress={() => router.push('/group-edit')}
        />
        {allColorsUsed ? (
          <Text style={[styles.note, { color: c.textFaint }]}>
            Every colour is in use. Delete one of your groups to add another.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 1 },
  note: { fontSize: 13, textAlign: 'center' },
});
