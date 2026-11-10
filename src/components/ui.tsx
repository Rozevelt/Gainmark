import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Icon, type IconName } from '@/components/icon';
import { radius, useColors } from '@/theme';

export function IconButton({
  name,
  onPress,
  color,
  size = 24,
  label,
  compact,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
  /** Narrower hit box, for rows of several icons. */
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        size > 30 && { width: size + 12, height: size + 12 },
        compact && { width: 36 },
        pressed && { backgroundColor: c.surface2 },
      ]}>
      <Icon name={name} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

/** Top bar with safe-area padding. `left` usually holds a back/close button. */
export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
  onTitlePress,
}: {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onTitlePress?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const titleBlock = (
    <View>
      <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.textDim }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.bg }]}>
      {left}
      <View style={styles.headerTitle}>
        {!title ? null : onTitlePress ? (
          <Pressable onPress={onTitlePress} accessibilityRole="button">
            {titleBlock}
          </Pressable>
        ) : (
          titleBlock
        )}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.surface2 : 'transparent';
  const fg =
    variant === 'primary'
      ? c.onAccent
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.accent
          : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  dotColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  /** Muscle-group colour: shows a dot, and the chip is outlined in it when selected. */
  dotColor?: string;
}) {
  const c = useColors();
  const colors = dotColor
    ? selected
      ? { backgroundColor: c.surface2, borderColor: dotColor }
      : { backgroundColor: c.surface, borderColor: c.border }
    : selected
      ? { backgroundColor: c.accent, borderColor: c.accent }
      : { backgroundColor: c.surface, borderColor: c.border };
  const textColor = selected && !dotColor ? c.onAccent : c.text;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, colors, dotColor ? { borderWidth: selected ? 2 : 1 } : null]}>
      {dotColor ? <View style={[styles.chipDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.chipText, { color: textColor }, selected && dotColor ? { fontWeight: '800' } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

const styles = StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  headerTitle: { flex: 1, paddingHorizontal: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
