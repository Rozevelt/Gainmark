import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { radius, useColors } from '@/theme';

type Toast = { id: number; title: string; sub?: string; icon: IconName };

const useToast = create<{ toast: Toast | null }>(() => ({ toast: null }));

/** A small note that slides in at the top for a moment, e.g. "New PR". */
export function showToast(title: string, sub?: string, icon: IconName = 'check') {
  useToast.setState({ toast: { id: Date.now(), title, sub, icon } });
}

/** A new personal record: a light buzz and a small note at the top. */
export function celebratePR(sub: string) {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  showToast('New PR', sub, 'trophy');
}

/** After copying a workout: say how many moves auto progression moved up. */
export function showProgressed(moves: number) {
  if (moves > 0) showToast('Progressed', `${moves} ${moves === 1 ? 'move' : 'moves'} moved up`, 'up');
}

const SHOW_MS = 2000;

/** Draws the current toast (mounted once in the root layout). */
export function ToastHost() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const toast = useToast((s) => s.toast);
  const opacity = useSharedValue(0);
  const y = useSharedValue(-10);

  useEffect(() => {
    if (!toast) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(SHOW_MS, withTiming(0, { duration: 260 })),
    );
    y.value = withSequence(withTiming(0, { duration: 180 }), withDelay(SHOW_MS, withTiming(-10, { duration: 260 })));
    const t = setTimeout(() => useToast.setState({ toast: null }), SHOW_MS + 500);
    return () => clearTimeout(t);
  }, [toast, opacity, y]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View style={[styles.pill, { backgroundColor: c.surface2, borderColor: c.border }, style]}>
        <Icon name={toast.icon} size={16} color={c.accent} />
        <Text style={[styles.title, { color: c.accent }]}>{toast.title}</Text>
        {toast.sub ? (
          <Text style={[styles.sub, { color: c.text }]} numberOfLines={1}>
            {toast.sub}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
