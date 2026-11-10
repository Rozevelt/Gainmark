import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Toggle } from '@/components/toggle';
import { Button, IconButton, ScreenHeader } from '@/components/ui';
import {
  backupTime,
  deleteBackup,
  listBackups,
  readBackup,
  restoreData,
  summarize,
  summaryText,
  writeBackup,
  type StoredBackup,
} from '@/lib/backup';
import { choose, notify } from '@/lib/confirm';
import { DEFAULT_BACKUP, useStore } from '@/store/store';
import { radius, useColors } from '@/theme';

const KIND_LABEL: Record<StoredBackup['kind'], string> = {
  daily: 'Daily backup',
  manual: 'Backed up by you',
  'before-import': 'Before an import',
};

export default function BackupsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const backup = useStore((s) => s.settings.backup) ?? DEFAULT_BACKUP;
  const setBackupSettings = useStore((s) => s.setBackupSettings);
  const [backups, setBackups] = useState(listBackups);
  const [busy, setBusy] = useState(false);
  const refresh = () => setBackups(listBackups());

  const backUpNow = async () => {
    setBusy(true);
    try {
      await writeBackup('manual');
      refresh();
    } catch {
      notify("Couldn't back up", 'Something went wrong saving the backup. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const open = async (b: StoredBackup) => {
    let data;
    try {
      data = await readBackup(b);
    } catch (e) {
      choose("Can't read this backup", e instanceof Error ? e.message : 'The file is damaged.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete it', style: 'destructive', onPress: () => (deleteBackup(b), refresh()) },
      ]);
      return;
    }
    choose(
      `${KIND_LABEL[b.kind]} · ${backupTime(b.time)}`,
      `${summaryText(summarize(data))} Restoring replaces everything on this phone with this backup. What's there now is backed up first.`,
      [
        { text: 'Delete', style: 'destructive', onPress: () => (deleteBackup(b), refresh()) },
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await restoreData(data);
              refresh();
              notify('Restored', `Your data is back to ${backupTime(b.time)}.`);
            } catch {
              notify("Couldn't restore", 'Nothing was changed. Try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Backups"
        subtitle="Saved on this phone"
        left={<IconButton name="back" label="Back" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.text }]}>Daily backups</Text>
              <Text style={[styles.note, { color: c.textDim }]}>
                A copy of all your data each day. The last 14 are kept.
              </Text>
            </View>
            <Toggle value={backup.auto} onValueChange={(auto) => setBackupSettings({ auto })} label="Daily backups" />
          </View>
          <Button title="Back up now" icon="backup" variant="secondary" onPress={backUpNow} disabled={busy} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: c.textDim }]}>SAVED BACKUPS</Text>
          <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.border }]}>
            {backups.length ? (
              backups.map((b, i) => (
                <Pressable
                  key={b.name}
                  onPress={() => open(b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                    pressed && { backgroundColor: c.surface2 },
                  ]}>
                  <Icon name={b.kind === 'before-import' ? 'reset' : 'history'} size={20} color={c.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: c.text }]}>{backupTime(b.time)}</Text>
                    <Text style={[styles.note, { color: c.textDim }]}>{KIND_LABEL[b.kind]}</Text>
                  </View>
                  <Icon name="right" size={18} color={c.textFaint} />
                </Pressable>
              ))
            ) : (
              <Text style={[styles.empty, { color: c.textFaint }]}>No backups yet.</Text>
            )}
          </View>
        </View>

        <Text style={[styles.note, { color: c.textFaint, textAlign: 'center' }]}>
          Backups are deleted if you uninstall Gainmark. To keep a copy somewhere else, use Export data in
          Settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 22 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 14, gap: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  list: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 14, textAlign: 'center', padding: 18 },
});
