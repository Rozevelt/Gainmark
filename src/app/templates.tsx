import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { IconButton } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { dayGroups } from '@/lib/summary';
import { useExercises, useGroups, useStore } from '@/store/store';
import { useColors } from '@/theme';

/** Saved workouts: rename (tap) or delete. */
export default function TemplatesScreen() {
  const c = useColors();
  const templates = useStore((s) => s.templates);
  const deleteTemplate = useStore((s) => s.deleteTemplate);
  const { byId } = useExercises();
  const { groupById } = useGroups();

  return (
    <SettingsPage title="Saved workouts">
      {templates.length ? (
        <Section>
          {templates.map((t, i) => {
            const groups = dayGroups(t.entries, byId, groupById);
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/template-edit', params: { id: t.id } })}
                accessibilityRole="button"
                accessibilityHint="Rename"
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  pressed && { backgroundColor: c.surface2 },
                ]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <View style={styles.meta}>
                    {groups.map((g) => (
                      <View key={g.id} style={[styles.dot, { backgroundColor: g.color }]} />
                    ))}
                    <Text style={[settingsStyles.rowSub, { color: c.textDim, marginTop: 0 }]} numberOfLines={1}>
                      {t.entries.length} {t.entries.length === 1 ? 'move' : 'moves'}
                      {groups.length ? ` · ${groups.map((g) => g.name).join(' · ')}` : ''}
                    </Text>
                  </View>
                </View>
                <IconButton
                  name="delete"
                  size={20}
                  color={c.textFaint}
                  label={`Delete ${t.name}`}
                  onPress={() =>
                    confirmAction(
                      'Delete saved workout?',
                      `“${t.name}” will be removed. Logged workouts stay.`,
                      'Delete',
                      () => deleteTemplate(t.id),
                    )
                  }
                />
              </Pressable>
            );
          })}
        </Section>
      ) : (
        <View style={styles.empty}>
          <Icon name="bookmark" size={32} color={c.textFaint} />
          <Text style={[styles.emptyText, { color: c.textDim }]}>
            No saved workouts yet. On a day with moves, tap “Save as workout” under them.
          </Text>
        </View>
      )}
      {templates.length ? (
        <Text style={[settingsStyles.footnote, { color: c.textFaint }]}>
          Tap a workout to rename it. Start one from an empty day.
        </Text>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 4, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
