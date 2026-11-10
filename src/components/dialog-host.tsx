import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { useDialog, type DialogOption } from '@/lib/confirm';
import { radius, useColors } from '@/theme';

/**
 * Draws confirmations and notices (from lib/confirm) as an in-app dialog in the app's own
 * style, instead of the phone's system alert. Mounted once in the root layout.
 */
export function DialogHost() {
  const c = useColors();
  const dialog = useDialog((s) => s.dialog);
  const close = useDialog((s) => s.close);
  const cancel = dialog?.options.find((o) => o.style === 'cancel');

  const press = (o: DialogOption) => {
    tick('light');
    close();
    o.onPress?.();
  };

  // Two buttons sit side by side (cancel left); more stack vertically.
  const options = dialog ? [...dialog.options].sort((a, b) => (a.style === 'cancel' ? -1 : b.style === 'cancel' ? 1 : 0)) : [];
  const stacked = options.length > 2;

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => (cancel ? press(cancel) : close())}>
      <Pressable style={styles.backdrop} onPress={() => (cancel ? press(cancel) : close())}>
        {/* Inner Pressable stops taps on the card from closing it. */}
        <Pressable style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: c.text }]}>{dialog?.title}</Text>
          {dialog?.message ? <Text style={[styles.message, { color: c.textDim }]}>{dialog.message}</Text> : null}
          <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
            {options.map((o) => {
              const bg = o.style === 'destructive' ? c.danger : o.style === 'cancel' ? c.surface2 : c.accent;
              const fg = o.style === 'destructive' ? '#fff' : o.style === 'cancel' ? c.text : c.onAccent;
              return (
                <Pressable
                  key={o.text}
                  onPress={() => press(o)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    !stacked && styles.buttonFlex,
                    { backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
                  ]}>
                  <Text style={[styles.buttonText, { color: fg }]}>{o.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '800' },
  message: { fontSize: 15, lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  buttonsStacked: { flexDirection: 'column-reverse' },
  button: { height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonFlex: { flex: 1 },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
