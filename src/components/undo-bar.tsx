import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Icon } from '@/components/icon';
import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { radius, useColors } from '@/theme';

type Pending = { id: number; message: string; undo: () => void };

const useUndo = create<{ pending: Pending | null }>(() => ({ pending: null }));

const SHOW_MS = 6000;

/** Show "<message> · Undo" at the bottom for a few seconds. */
export function offerUndo(message: string, undo: () => void) {
  useUndo.setState({ pending: { id: Date.now(), message, undo } });
}

/** Draws the undo bar (mounted once in the root layout). */
export function UndoBar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pending = useUndo((s) => s.pending);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      if (useUndo.getState().pending?.id === pending.id) useUndo.setState({ pending: null });
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 16 }]}>
      <View style={[styles.bar, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Icon name="delete" size={16} color={c.textDim} />
        <Text style={[styles.message, { color: c.text }]} numberOfLines={1}>
          {pending.message}
        </Text>
        <Pressable
          onPress={() => {
            tick();
            pending.undo();
            useUndo.setState({ pending: null });
          }}
          hitSlop={10}
          accessibilityRole="button">
          <Text style={[styles.action, { color: c.accent }]}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  message: { flex: 1, fontSize: 15, fontWeight: '600' },
  action: { fontSize: 15, fontWeight: '800' },
});
