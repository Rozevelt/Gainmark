import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Text, TextInput } from '@/components/text';
import { Button, Chip, IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { MOVE_KINDS, type MoveKind } from '@/data/exercises';
import { notify } from '@/lib/confirm';
import { useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

export default function NewExerciseScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ name?: string; group?: string }>();
  const createExercise = useStore((s) => s.createExercise);
  const { all } = useExercises();
  const { groups, groupById } = useGroups();

  const [name, setName] = useState(params.name ?? '');
  const [kind, setKind] = useState<MoveKind>('weight');
  const [group, setGroup] = useState<string | null>(params.group && groupById.has(params.group) ? params.group : null);

  const canSave = name.trim().length > 0 && group != null;

  const save = () => {
    if (!canSave) return;
    const trimmed = name.trim();
    const existing = all.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      notify('Already in the library', `"${existing.name}" already exists. Search for it in the list.`);
      return;
    }
    createExercise(trimmed, group!, kind);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="New move" left={<IconButton name="close" label="Cancel" onPress={() => router.back()} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: c.textDim }]}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Cable Y-Raise"
            placeholderTextColor={c.textFaint}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={60}
            style={[styles.input, webNoOutline, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />

          <Text style={[styles.label, { color: c.textDim, marginTop: 20 }]}>MUSCLE GROUP</Text>
          <View style={styles.chips}>
            {groups.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                dotColor={g.color}
                selected={group === g.id}
                onPress={() => setGroup(g.id)}
              />
            ))}
            <Chip label="+ Group" selected={false} onPress={() => router.push('/group-edit')} />
          </View>

          <Text style={[styles.label, { color: c.textDim, marginTop: 20 }]}>TYPE</Text>
          <View style={styles.chips}>
            {MOVE_KINDS.map((k) => (
              <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />
            ))}
          </View>
          <Text style={[styles.hint, { color: c.textFaint }]}>{MOVE_KINDS.find((k) => k.id === kind)?.hint}</Text>

          <Button title="Save move" icon="check" onPress={save} disabled={!canSave} style={{ marginTop: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, marginTop: 8 },
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  input: { height: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
