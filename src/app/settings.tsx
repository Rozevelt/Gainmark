import { router } from 'expo-router';
import { Linking, Platform, View } from 'react-native';

import { NavRow, Row, Section, SettingsPage, settingsStyles } from '@/components/settings-ui';
import { Text } from '@/components/text';
import { appVersion, checkForUpdateNow, REPO_URL } from '@/lib/updates';
import { DEFAULT_BACKUP, DEFAULT_REST, DEFAULT_THEME, DEFAULT_TIMER, useGoal, useStore } from '@/store/store';
import { ACCENTS, useColors } from '@/theme';

/** Settings home: one row per category, each opening its own screen. */
export default function SettingsScreen() {
  const c = useColors();
  const unit = useStore((s) => s.settings.unit);
  const goal = useGoal();
  const timer = useStore((s) => s.settings.timer) ?? DEFAULT_TIMER;
  const rest = useStore((s) => s.settings.rest) ?? DEFAULT_REST;
  const groups = useStore((s) => s.groups);
  const dayCount = useStore((s) => Object.keys(s.days).length);
  const backupOn = (useStore((s) => s.settings.backup) ?? DEFAULT_BACKUP).auto;
  const theme = useStore((s) => s.settings.theme) ?? DEFAULT_THEME;

  return (
    <SettingsPage title="Settings">
      <Section>
        <NavRow
          icon="dumbbell"
          label="Workouts"
          sub={`${unit} · ${goal ? `goal ${goal} a week` : 'no weekly goal'} · split, plates`}
          onPress={() => router.push('/settings-workouts')}
        />
        <NavRow
          icon="timer"
          label="Timers"
          sub={`Workout timer ${timer.enabled ? 'on' : 'off'} · rest ${rest.autoStart ? 'starts by itself' : 'manual'}`}
          onPress={() => router.push('/settings-timers')}
        />
        <NavRow
          icon="cards"
          label="Move cards"
          sub="What cards show · warm-up steps"
          onPress={() => router.push('/settings-cards')}
        />
        <NavRow
          icon="brush"
          label="Appearance"
          sub={`${ACCENTS.find((a) => a.id === theme.accent)?.name ?? 'Lime'} · ${
            theme.mode === 'system' ? 'follows phone' : theme.mode
          }`}
          onPress={() => router.push('/settings-appearance')}
        />
        <NavRow
          icon="palette"
          label="Muscle groups"
          sub={`${groups.length} groups`}
          onPress={() => router.push('/groups')}
          right={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {groups.slice(0, 6).map((g) => (
                <View key={g.id} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: g.color }} />
              ))}
            </View>
          }
        />
        <NavRow
          icon="backup"
          label="Your data"
          sub={`${dayCount} ${dayCount === 1 ? 'workout' : 'workouts'} · export, import${backupOn ? ', backups' : ''}`}
          onPress={() => router.push('/settings-data')}
          last
        />
      </Section>

      <Section title="ABOUT">
        <Row label="Gainmark" value={`v${appVersion()}`} />
        {/* The web app is always the newest version; the Android app checks GitHub. */}
        {Platform.OS !== 'web' ? <NavRow label="Check for updates" onPress={checkForUpdateNow} /> : null}
        <NavRow
          label="Gainmark on GitHub"
          sub="github.com/Rozevelt/Gainmark"
          onPress={() => Linking.openURL(REPO_URL)}
        />
        <Row label="Made by" value="Rozevelt" last />
      </Section>

      <Text style={[settingsStyles.footnote, { color: c.textFaint }]}>
        Workouts are saved on this phone. Export a file to keep a copy elsewhere.
      </Text>
    </SettingsPage>
  );
}
