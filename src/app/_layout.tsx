import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogHost } from '@/components/dialog-host';
import { InstallGate, needsInstall } from '@/components/install-gate';
import { LiveTimerHost } from '@/components/live-timer-host';
import { ToastHost } from '@/components/toast';
import { APP_FONTS } from '@/components/text';
import { autoBackup } from '@/lib/backup';
import { autoCheckForUpdate } from '@/lib/updates';
import { syncReminders } from '@/lib/reminders';
import { DEFAULT_REMINDER, useGroups, useStore } from '@/store/store';
import { useColors, useIsDark } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const c = useColors();
  const isDark = useIsDark();
  const dataReady = useStore((s) => s.ready);
  const split = useStore((s) => s.settings.split);
  const reminder = useStore((s) => s.settings.reminder);
  const { groupById } = useGroups();
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  // If a font fails to load, carry on with the system font rather than hang on the splash.
  const ready = dataReady && (fontsLoaded || fontError != null);

  useEffect(() => {
    useStore.getState().load();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Daily backup: once the data has loaded, and again whenever the app goes to the background.
  useEffect(() => {
    if (!dataReady) return;
    autoBackup();
    // Once a day: is there a newer version on GitHub?
    autoCheckForUpdate();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') autoBackup();
    });
    return () => sub.remove();
  }, [dataReady]);

  // The native window shows through during screen transitions; keep it the app's
  // background colour instead of the default white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  // Keep scheduled reminders in step with the split, the reminder time and group names.
  useEffect(() => {
    if (!dataReady) return;
    syncReminders(split, reminder ?? DEFAULT_REMINDER, groupById).catch((e) =>
      console.warn('Could not schedule reminders', e),
    );
  }, [dataReady, split, reminder, groupById]);

  if (!ready) return null;

  // Web on a phone, in a browser tab: show how to add it to the Home Screen instead.
  if (needsInstall()) return <InstallGate />;

  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.bg, primary: c.accent } };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-exercise" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-exercise" options={{ presentation: 'modal' }} />
        <Stack.Screen name="move/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="groups" />
        <Stack.Screen name="group-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="split" />
        <Stack.Screen name="timer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="progress" />
        <Stack.Screen name="pick-move" options={{ presentation: 'modal' }} />
        <Stack.Screen name="backups" />
        <Stack.Screen name="template-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="tutorial" options={{ animation: 'fade' }} />
        <Stack.Screen name="workout/[date]" />
      </Stack>
      <DialogHost />
      <ToastHost />
      <LiveTimerHost />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
