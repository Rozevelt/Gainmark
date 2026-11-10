import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { TextInput } from '@/components/text';
import { webNoOutline } from '@/components/ui';
import { formatClock, formatWeight } from '@/store/store';
import { radius, useColors } from '@/theme';

/** Small haptic tick (no-op on web). */
export function tick(style: 'select' | 'light' = 'select') {
  if (Platform.OS === 'web') return;
  if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else Haptics.selectionAsync();
}

/**
 * How a value is shown and typed: whole numbers, decimals, or a clock ("1:30") where a plain
 * typed number means seconds or minutes.
 */
export type NumberMode = 'int' | 'decimal' | 'seconds' | 'minutes';

/** − value + ; hold a button to keep stepping. The value can also be typed. */
export function Stepper({
  value,
  onChange,
  onStep,
  decimal = false,
  mode,
  placeholder = '0',
  color,
  label,
  style,
  height = 44,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onStep: (dir: 1 | -1) => void;
  decimal?: boolean;
  /** Overrides `decimal`; 'seconds' / 'minutes' show the value as a clock. */
  mode?: NumberMode;
  placeholder?: string;
  color?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.stepper,
        { height, backgroundColor: c.surface2, borderColor: focused ? c.accent : 'transparent' },
        style,
      ]}>
      <StepButton icon="minus" label={`Less ${label}`} onStep={() => onStep(-1)} />
      <NumField
        value={value}
        onChange={onChange}
        mode={mode ?? (decimal ? 'decimal' : 'int')}
        placeholder={placeholder}
        color={color ?? c.text}
        onFocusChange={setFocused}
      />
      <StepButton icon="add" label={`More ${label}`} onStep={() => onStep(1)} />
    </View>
  );
}

function StepButton({ icon, label, onStep }: { icon: IconName; label: string; onStep: () => void }) {
  const c = useColors();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const once = () => {
    tick();
    onStep();
  };

  // Holding the button keeps stepping until it's released.
  const startRepeat = () => {
    once();
    const repeat = () => {
      timer.current = setTimeout(() => {
        once();
        repeat();
      }, 90);
    };
    repeat();
  };

  return (
    <Pressable
      onPress={once}
      onLongPress={startRepeat}
      delayLongPress={350}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.stepButton, pressed && { backgroundColor: c.border }]}>
      <Icon name={icon} size={18} color={c.textDim} />
    </Pressable>
  );
}

const isClock = (mode: NumberMode) => mode === 'seconds' || mode === 'minutes';

/**
 * Typed text → value. Clocks take "1:30" or "1.30" (minutes and seconds) or "1:02:30"; a plain
 * number is seconds ('seconds') or minutes ('minutes').
 */
function parse(text: string, mode: NumberMode): number | null {
  const t = text.replace(',', '.').trim();
  if (!t) return null;
  if (isClock(mode)) {
    const parts = t.split(/[:.]/).map((x) => parseInt(x || '0', 10));
    if (parts.some((n) => !Number.isFinite(n))) return null;
    if (parts.length === 1) return mode === 'minutes' ? parts[0] * 60 : parts[0];
    return parts.reduce((total, n) => total * 60 + n, 0);
  }
  const n = mode === 'decimal' ? parseFloat(t) : parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function show(value: number | null, mode: NumberMode) {
  if (value == null) return '';
  return isClock(mode) ? formatClock(value) : formatWeight(value);
}

function NumField({
  value,
  onChange,
  mode,
  placeholder,
  color,
  onFocusChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  mode: NumberMode;
  placeholder: string;
  color: string;
  onFocusChange: (focused: boolean) => void;
}) {
  const c = useColors();
  // Keep the raw text locally so "62." or "62," can be typed mid-edit.
  const [text, setText] = useState(show(value, mode));
  const [prevValue, setPrevValue] = useState(value);

  // If the value changes from outside this field (− / + buttons), show it.
  if (value !== prevValue) {
    setPrevValue(value);
    if (parse(text, mode) !== value) setText(show(value, mode));
  }

  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const clean = isClock(mode)
          ? t.replace(/[^0-9:.,]/g, '')
          : mode === 'decimal'
            ? t.replace(/[^0-9.,-]/g, '')
            : t.replace(/[^0-9]/g, '');
        setText(clean);
        onChange(parse(clean, mode));
      }}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      keyboardType={mode === 'int' ? 'number-pad' : 'decimal-pad'}
      selectTextOnFocus
      placeholder={placeholder}
      placeholderTextColor={c.textFaint}
      maxLength={isClock(mode) ? 8 : mode === 'decimal' ? 6 : 4}
      style={[styles.input, webNoOutline, { color }]}
    />
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  stepButton: { width: 32, height: '100%', alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});
