import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { IconButton, ScreenHeader } from '@/components/ui';
import { radius, useColors } from '@/theme';

/** A settings page: title with a back button, and scrolling sections. */
export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title={title} left={<IconButton name="back" label="Back" onPress={() => router.back()} />} />
      <ScrollView contentContainerStyle={[settingsStyles.content, { paddingBottom: insets.bottom + 32 }]}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={[settingsStyles.sectionTitle, { color: c.textDim }]}>{title}</Text> : null}
      <View style={[settingsStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

/** A label with a control (or a plain value) on the right. */
export function Row({
  label,
  sub,
  value,
  children,
  last,
}: {
  label: string;
  sub?: string;
  value?: string;
  children?: ReactNode;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        settingsStyles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}>
      <View style={{ flex: 1, paddingVertical: sub ? 10 : 0 }}>
        <Text style={[settingsStyles.rowLabel, { color: c.text }]}>{label}</Text>
        {sub ? <Text style={[settingsStyles.rowSub, { color: c.textDim }]}>{sub}</Text> : null}
      </View>
      {children ?? <Text style={[settingsStyles.rowValue, { color: c.textDim }]}>{value}</Text>}
    </View>
  );
}

/** A row that opens another screen or runs an action. */
export function NavRow({
  icon,
  label,
  sub,
  onPress,
  right,
  last,
}: {
  icon?: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  /** Extra content just before the chevron (e.g. colour dots). */
  right?: ReactNode;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        settingsStyles.row,
        settingsStyles.navRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        pressed && { backgroundColor: c.surface2 },
      ]}>
      {icon ? (
        <View style={[settingsStyles.navIcon, { backgroundColor: c.accentSoft }]}>
          <Icon name={icon} size={20} color={c.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[settingsStyles.rowLabel, { color: c.text }]}>{label}</Text>
        {sub ? (
          <Text style={[settingsStyles.rowSub, { color: c.textDim }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
      <Icon name="right" size={20} color={c.textFaint} />
    </Pressable>
  );
}

/** − value + in a pill, for small numbers like rest time or the weekly goal. */
export function PillStepper({
  value,
  onLess,
  onMore,
  lessLabel,
  moreLabel,
  compact = false,
}: {
  value: string;
  onLess: () => void;
  onMore: () => void;
  lessLabel: string;
  moreLabel: string;
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[settingsStyles.pill, { backgroundColor: c.surface2 }]}>
      <IconButton compact={compact} name="minus" size={compact ? 16 : 18} label={lessLabel} onPress={onLess} />
      <Text style={[compact ? settingsStyles.pillValueSmall : settingsStyles.pillValue, { color: c.text }]}>
        {value}
      </Text>
      <IconButton compact={compact} name="add" size={compact ? 16 : 18} label={moreLabel} onPress={onMore} />
    </View>
  );
}

export const settingsStyles = StyleSheet.create({
  content: { padding: 16, gap: 22 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowValue: { fontSize: 16 },
  navRow: { justifyContent: 'flex-start', paddingVertical: 10 },
  navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 2 },
  pillValue: { fontSize: 17, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  pillValueSmall: { fontSize: 15, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  box: { padding: 14, gap: 10 },
  note: { fontSize: 13, lineHeight: 18 },
  footnote: { fontSize: 13, textAlign: 'center' },
  segment: { flexDirection: 'row', borderRadius: radius.sm, padding: 3 },
  segmentItem: { paddingHorizontal: 18, height: 32, borderRadius: 6, justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
});
