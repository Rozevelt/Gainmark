import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { shortLabel, todayKey } from '@/lib/dates';
import { DEFAULT_BACKUP, getAppData, useStore, type AppData } from '@/store/store';

/**
 * Export, import and automatic backups. Everything is one JSON file:
 * { app: 'gainmark', version, exportedAt, data }.
 */

const FORMAT_VERSION = 1;
const MIME = 'application/json';
/** How many backups are kept on the phone (oldest are removed). */
const KEEP = 14;

type BackupFile = { app: 'gainmark'; version: number; exportedAt: string; data: AppData };

export type BackupSummary = { workouts: number; first?: string; last?: string };

export type StoredBackup = {
  name: string;
  file: File;
  /** When it was made (ms). */
  time: number;
  kind: 'daily' | 'manual' | 'before-import';
};

function toJson(): string {
  const file: BackupFile = { app: 'gainmark', version: FORMAT_VERSION, exportedAt: new Date().toISOString(), data: getAppData() };
  return JSON.stringify(file);
}

/** Workout count and date range of some data, for "Restore 42 workouts (Jan–Nov)?" prompts. */
export function summarize(data: AppData): BackupSummary {
  const dates = Object.keys(data.days)
    .filter((d) => data.days[d]?.length)
    .sort();
  return { workouts: dates.length, first: dates[0], last: dates[dates.length - 1] };
}

/** Read a Gainmark file. Throws a readable message when it isn't one. */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Gainmark backup.");
  }
  const f = parsed as Partial<BackupFile>;
  if (!f || f.app !== 'gainmark' || typeof f.data !== 'object' || !f.data) {
    throw new Error("This file isn't a Gainmark backup.");
  }
  if ((f.version ?? 0) > FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Gainmark. Update the app and try again.');
  }
  const d = f.data as Partial<AppData>;
  if (typeof d.days !== 'object' || d.days === null || Array.isArray(d.days)) {
    throw new Error('This backup has no workouts in it.');
  }
  return {
    days: d.days,
    customExercises: Array.isArray(d.customExercises) ? d.customExercises : [],
    settings: d.settings && typeof d.settings === 'object' ? d.settings : { unit: 'kg' },
    exerciseSettings: d.exerciseSettings && typeof d.exerciseSettings === 'object' ? d.exerciseSettings : {},
    groups: Array.isArray(d.groups) ? d.groups : [],
    sessions: d.sessions && typeof d.sessions === 'object' ? d.sessions : {},
    bodyweights: d.bodyweights && typeof d.bodyweights === 'object' ? d.bodyweights : {},
    templates: Array.isArray(d.templates) ? d.templates : [],
    measurements: d.measurements && typeof d.measurements === 'object' ? d.measurements : {},
  };
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${todayKey()}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** "Today 16:05", "Yesterday 09:12" or "Mon 3 Nov 18:40". */
export function backupTime(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return `${shortLabel(key)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function summaryText(s: BackupSummary) {
  if (!s.workouts) return 'No workouts in it.';
  const range = s.first && s.last && s.first !== s.last ? ` (${shortLabel(s.first)} – ${shortLabel(s.last)})` : '';
  return `${s.workouts} ${s.workouts === 1 ? 'workout' : 'workouts'}${range}.`;
}

// ---------- export / import ----------

/**
 * Save the export file. On Android you pick a folder (e.g. Downloads) and it's written there;
 * elsewhere the share sheet opens. Returns the saved file name, or null if cancelled.
 */
export async function exportToFolder(): Promise<string | null> {
  const name = `gainmark-${todayKey()}.json`;
  if (Platform.OS !== 'android') {
    await shareExport();
    return null;
  }
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return null; // picker closed
  }
  const file = dir.createFile(name, MIME);
  await file.write(toJson());
  return file.name || name;
}

/** Send the export file with the share sheet (Drive, email, messages…). */
export async function shareExport(): Promise<void> {
  const file = new File(Paths.cache, `gainmark-${todayKey()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(toJson());
  await Sharing.shareAsync(file.uri, { mimeType: MIME, dialogTitle: 'Gainmark data', UTI: 'public.json' });
}

/** Let the user pick a file and read it. Returns null if they cancel. */
export async function pickImportFile(): Promise<AppData | null> {
  const picked = await File.pickFileAsync({ mimeTypes: [MIME, 'text/plain', '*/*'] });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text());
}

/** Replace all data, keeping a backup of what was there first so it can be undone. */
export async function restoreData(data: AppData): Promise<void> {
  if (summarize(getAppData()).workouts > 0) await writeBackup('before-import');
  await useStore.getState().replaceAllData(data);
}

// ---------- backups on the phone ----------

function backupDir(): Directory {
  const dir = new Directory(Paths.document, 'backups');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function kindOf(name: string): StoredBackup['kind'] {
  if (name.includes('before-import')) return 'before-import';
  if (name.includes('manual')) return 'manual';
  return 'daily';
}

/** Saved backups, newest first. */
export function listBackups(): StoredBackup[] {
  try {
    return backupDir()
      .list()
      .filter((f): f is File => f instanceof File && f.name.endsWith('.json'))
      .map((file) => ({
        name: file.name,
        file,
        time: file.info().modificationTime ?? 0,
        kind: kindOf(file.name),
      }))
      .sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}

/**
 * Write a backup now. Daily backups use one file per day (rewritten during the day), so the
 * day's last state is what's kept.
 */
export async function writeBackup(kind: StoredBackup['kind']): Promise<void> {
  const name = kind === 'daily' ? `daily-${todayKey()}.json` : `${kind}-${stamp()}.json`;
  const file = new File(backupDir(), name);
  if (file.exists) file.delete();
  file.create();
  await file.write(toJson());
  for (const old of listBackups().slice(KEEP)) {
    try {
      old.file.delete();
    } catch {}
  }
}

export async function readBackup(b: StoredBackup): Promise<AppData> {
  return parseBackup(await b.file.text());
}

export function deleteBackup(b: StoredBackup) {
  b.file.delete();
}

/** The daily backup, when it's on and there's something to back up. Never throws. */
export async function autoBackup(): Promise<void> {
  if (Platform.OS === 'web') return;
  const s = useStore.getState();
  if (!s.ready || !({ ...DEFAULT_BACKUP, ...s.settings.backup }.auto)) return;
  if (!Object.keys(s.days).length) return;
  try {
    await writeBackup('daily');
  } catch (e) {
    console.warn('Backup failed', e);
  }
}
