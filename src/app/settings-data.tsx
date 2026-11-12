import { router } from 'expo-router';

import { NavRow, Row, Section, SettingsPage } from '@/components/settings-ui';
import { exportToFolder, pickImportFile, restoreData, shareExport, summarize, summaryText } from '@/lib/backup';
import { choose, notify } from '@/lib/confirm';
import { DEFAULT_BACKUP, useStore } from '@/store/store';

/** Workout count, export, import and backups. */
export default function DataSettings() {
  const dayCount = useStore((s) => Object.keys(s.days).length);
  const backupOn = (useStore((s) => s.settings.backup) ?? DEFAULT_BACKUP).auto;

  return (
    <SettingsPage title="Your data">
      <Section>
        <Row label="Workouts logged" value={String(dayCount)} last />
      </Section>

      <Section title="FILES">
        <NavRow icon="download" label="Export data" sub="Save a file with all your workouts" onPress={exportData} />
        <NavRow icon="upload" label="Import data" sub="Load a Gainmark file" onPress={importData} last />
      </Section>

      <Section title="ON THIS PHONE">
        <NavRow
          icon="backup"
          label="Backups"
          sub={backupOn ? 'Daily, on this phone' : 'Daily backups are off'}
          onPress={() => router.push('/backups')}
          last
        />
      </Section>

      <Section title="HELP">
        <NavRow label="Replay tutorial" sub="A quick tour of the app" onPress={() => router.push('/tutorial')} last />
      </Section>
    </SettingsPage>
  );
}

function exportData() {
  choose('Export data', 'A file with all your workouts, moves, groups and settings.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Share',
      onPress: () =>
        shareExport().catch(() => notify("Couldn't export", 'Something went wrong making the file. Try again.')),
    },
    {
      text: 'Save to phone',
      onPress: async () => {
        try {
          const name = await exportToFolder();
          if (name) notify('Exported', `Saved as ${name}.`);
        } catch {
          notify("Couldn't save", 'Something went wrong saving the file. Try another folder.');
        }
      },
    },
  ]);
}

async function importData() {
  let data;
  try {
    data = await pickImportFile();
  } catch (e) {
    notify("Can't import", e instanceof Error ? e.message : "This file couldn't be read.");
    return;
  }
  if (!data) return;
  choose(
    'Replace your data?',
    `This file has ${summaryText(summarize(data))} It replaces everything on this phone. What's there now is backed up first, so you can undo this in Backups.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        style: 'destructive',
        onPress: async () => {
          try {
            await restoreData(data);
            notify('Imported', 'Your data has been loaded.');
          } catch {
            notify("Couldn't import", 'Nothing was changed. Try again.');
          }
        },
      },
    ],
  );
}
