import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Text, TextInput } from '@/components/text';
import { showToast } from '@/components/toast';
import { Button, IconButton, ScreenHeader, webNoOutline } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { fromKey } from '@/lib/dates';
import { groupSummary } from '@/lib/summary';
import { useExercises, useGroups, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

/**
 * Save a day's moves as a workout (`?date=`), or rename a saved workout (`?id=`).
 */
export default function TemplateEditScreen() {
  const c = useColors();
  const { date, id } = useLocalSearchParams<{ date?: string; id?: string }>();
  const days = useStore((s) => s.days);
  const templates = useStore((s) => s.templates);
  const split = useStore((s) => s.settings.split);
  const saveTemplate = useStore((s) => s.saveTemplate);
  const renameTemplate = useStore((s) => s.renameTemplate);
  const { byId } = useExercises();
  const { groupById } = useGroups();

  const existing = id ? templates.find((t) => t.id === id) : undefined;
  const entries = existing ? existing.entries : date ? (days[date] ?? []) : [];
  // A new one is named after the split day, or the muscle groups it hits.
  const plan = date && split?.some(Boolean) ? split[fromKey(date).getDay()] : undefined;
  const [name, setName] = useState(
    () => existing?.name ?? (plan?.name || groupSummary(entries, byId, groupById, 2) || 'Workout'),
  );
  const clean = name.trim();
  const clash = templates.find((t) => t.id !== existing?.id && t.name.toLowerCase() === clean.toLowerCase());

  const save = () => {
    if (!clean) return;
    if (existing) {
      renameTemplate(existing.id, clean);
      router.back();
      return;
    }
    if (!date) return;
    const doSave = () => {
      saveTemplate(clean, date);
      showToast('Saved', clean, 'bookmark');
      router.back();
    };
    if (clash)
      confirmAction('Replace saved workout?', `You already have a workout called "${clash.name}".`, 'Replace', doSave);
    else doSave();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title={existing ? 'Rename workout' : 'Save as workout'}
        left={<IconButton name="close" label="Close" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: c.textDim }]}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Legs A"
            placeholderTextColor={c.textFaint}
            autoFocus
            selectTextOnFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={save}
            maxLength={40}
            style={[styles.input, webNoOutline, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />
          {clash && !existing ? (
            <Text style={[styles.hint, { color: c.textDim }]}>Saving replaces your other “{clash.name}”.</Text>
          ) : null}

          <Text style={[styles.label, { color: c.textDim, marginTop: 20 }]}>
            {entries.length} {entries.length === 1 ? 'MOVE' : 'MOVES'}
          </Text>
          <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.border }]}>
            {entries.map((e, i) => {
              const ex = byId.get(e.exerciseId);
              const group = ex ? groupById.get(ex.group) : undefined;
              return (
                <View
                  key={i}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                  <View style={[styles.dot, { backgroundColor: group?.color ?? c.textFaint }]} />
                  <Text style={[styles.moveName, { color: c.text }]} numberOfLines={1}>
                    {ex?.name ?? 'Deleted move'}
                  </Text>
                  <Text style={[styles.moveMeta, { color: c.textDim }]}>
                    {e.sets.length} {e.sets.length === 1 ? 'set' : 'sets'}
                  </Text>
                </View>
              );
            })}
          </View>
          {!existing ? (
            <Text style={[styles.hint, { color: c.textFaint }]}>
              The weights and reps are saved too. Start it from an empty day.
            </Text>
          ) : null}

          <Button
            title={existing ? 'Save name' : 'Save workout'}
            icon="bookmark"
            onPress={save}
            disabled={!clean || (!existing && entries.length === 0)}
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  input: { height: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 17 },
  hint: { fontSize: 13, marginTop: 8 },
  list: { borderRadius: radius.md, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  moveName: { flex: 1, fontSize: 15, fontWeight: '600' },
  moveMeta: { fontSize: 13 },
});
