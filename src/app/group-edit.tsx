import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Text, TextInput } from '@/components/text';
import { Button, IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { GROUP_COLORS } from '@/data/groups';
import { confirmAction, notify } from '@/lib/confirm';
import { useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/** Add a muscle group (no id) or edit one (?id=). */
export default function GroupEditScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { groups, groupById } = useGroups();
  const { all } = useExercises();
  const addGroup = useStore((s) => s.addGroup);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);

  const existing = id ? groupById.get(id) : undefined;
  // Colours other groups already use can't be picked.
  const taken = new Set(groups.filter((g) => g.id !== existing?.id).map((g) => g.color));
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState<string | null>(
    existing?.color ?? GROUP_COLORS.find((col) => !taken.has(col)) ?? null,
  );
  const moveCount = existing ? all.filter((e) => e.group === existing.id).length : 0;
  const canSave = name.trim().length > 0 && color != null && !taken.has(color);

  const save = () => {
    if (!canSave || !color) return;
    const trimmed = name.trim();
    const clash = groups.find((g) => g.id !== existing?.id && g.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) {
      notify('Name in use', `There's already a group called "${clash.name}".`);
      return;
    }
    if (existing) updateGroup(existing.id, { name: trimmed, color });
    else addGroup(trimmed, color);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    if (moveCount > 0) {
      notify(
        'Group has moves',
        `"${existing.name}" has ${moveCount} ${moveCount === 1 ? 'move' : 'moves'}. Move them to another group or delete them first.`,
      );
      return;
    }
    confirmAction('Delete group?', `Delete "${existing.name}"?`, 'Delete', () => {
      deleteGroup(existing.id);
      router.back();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title={existing ? 'Edit group' : 'New group'}
        left={<IconButton name="close" label="Cancel" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: c.textDim }]}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Glutes"
            placeholderTextColor={c.textFaint}
            autoFocus={!existing}
            autoCapitalize="words"
            maxLength={24}
            style={[styles.input, webNoOutline, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />

          <Text style={[styles.label, { color: c.textDim, marginTop: 20 }]}>COLOUR</Text>
          <View style={styles.palette}>
            {GROUP_COLORS.map((col) => {
              const isTaken = taken.has(col);
              const isSelected = color === col;
              const owner = isTaken ? groups.find((g) => g.color === col)?.name : undefined;
              return (
                <Pressable
                  key={col}
                  disabled={isTaken}
                  onPress={() => setColor(col)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: isTaken }}
                  accessibilityLabel={isTaken ? `Colour used by ${owner}` : 'Colour'}
                  style={[styles.swatchWrap, isSelected && { borderColor: c.text }]}>
                  <View style={[styles.swatch, { backgroundColor: col, opacity: isTaken ? 0.18 : 1 }]}>
                    {isSelected ? <Icon name="check" size={20} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.note, { color: c.textFaint }]}>
            Faded colours are already used by another group.
          </Text>

          <View style={[styles.preview, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.previewDot, { backgroundColor: color ?? c.textFaint }]} />
            <Text style={[styles.previewText, { color: c.text }]}>{name.trim() || 'Group name'}</Text>
          </View>

          <Button title="Save group" icon="check" onPress={save} disabled={!canSave} style={{ marginTop: 8 }} />

          {existing ? (
            <>
              <Button
                title={`Add a move to ${existing.name}`}
                icon="add"
                variant="secondary"
                onPress={() => router.push({ pathname: '/new-exercise', params: { group: existing.id } })}
              />
              {existing.custom ? (
                <Button title="Delete group" icon="delete" variant="danger" onPress={remove} />
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  input: { height: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 17 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatchWrap: { padding: 3, borderRadius: 26, borderWidth: 2, borderColor: 'transparent' },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 13 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 10,
  },
  previewDot: { width: 14, height: 14, borderRadius: 7 },
  previewText: { fontSize: 16, fontWeight: '700' },
});
