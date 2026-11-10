import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type HostInstance } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

import { tick } from '@/components/stepper';
import { Text } from '@/components/text';
import { useColors } from '@/theme';

export type Slice = { id: string; label: string; color: string; value: number };

/**
 * Parts of a whole as a donut, with a legend that names every slice and its percentage
 * (so colour is never the only way to tell them apart). Tap a slice or a legend row to
 * highlight it; the centre then shows that slice. Tap the centre to switch the ring between
 * the total and every slice's percentage written on the ring.
 */
export function DonutChart({
  slices,
  format,
  totalLabel,
  size = 220,
}: {
  slices: Slice[];
  format: (v: number) => string;
  totalLabel: string;
  size?: number;
}) {
  const c = useColors();
  const [selected, setSelected] = useState<string | null>(null);
  // Percent view: each slice's % is written on the ring.
  const [showPcts, setShowPcts] = useState(false);
  const ringRef = useRef<HostInstance>(null);
  const total = slices.reduce((n, s) => n + s.value, 0);
  const stroke = 30;
  const r = (size - stroke) / 2 - 4;
  const circ = 2 * Math.PI * r;
  // A small gap between slices (none when there is only one).
  const gap = slices.length > 1 ? 3 : 0;
  const sel = slices.find((s) => s.id === selected) ?? null;
  // Whole percentages that always add up to 100 (largest remainder gets the leftover points).
  const pcts = (() => {
    if (!total) return new Map<string, number>();
    const raw = slices.map((s) => ({ id: s.id, exact: (s.value / total) * 100 }));
    const floors = raw.map((x) => ({ ...x, n: Math.floor(x.exact) }));
    let left = 100 - floors.reduce((n, x) => n + x.n, 0);
    [...floors]
      .sort((a, b) => b.exact - b.n - (a.exact - a.n))
      .forEach((x) => {
        if (left > 0) {
          x.n += 1;
          left -= 1;
        }
      });
    return new Map(floors.map((x) => [x.id, x.n]));
  })();
  const pct = (id: string) => pcts.get(id) ?? 0;

  // Each slice starts where the ones before it end.
  const lengths = slices.map((s) => (total ? (s.value / total) * circ : 0));
  const arcs = slices.map((s, i) => ({
    ...s,
    len: lengths[i],
    start: lengths.slice(0, i).reduce((n, l) => n + l, 0),
  }));

  const choose = (id: string | null) => {
    tick();
    setSelected((cur) => (cur === id ? null : id));
  };

  // The centre: first clears a highlighted slice, otherwise flips between total and percent views.
  const onCenterPress = () => {
    tick();
    if (selected) setSelected(null);
    else setShowPcts((v) => !v);
  };

  // Work out which slice a tap on the ring landed on.
  const onRingPress = (x: number, y: number) => {
    const dx = x - size / 2;
    const dy = y - size / 2;
    const dist = Math.hypot(dx, dy);
    if (dist < r - stroke / 2 - 4) return onCenterPress();
    if (dist > r + stroke) return choose(null);
    let angle = Math.atan2(dy, dx) + Math.PI / 2; // 0 at the top, clockwise
    if (angle < 0) angle += 2 * Math.PI;
    const at = (angle / (2 * Math.PI)) * circ;
    const hit = arcs.find((a) => at >= a.start && at < a.start + a.len);
    choose(hit?.id ?? null);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        ref={ringRef}
        // Measure from the chart's own position so the tap maps to the right slice everywhere.
        onPress={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          ringRef.current?.measure((_x, _y, _w, _h, left, top) => onRingPress(pageX - left, pageY - top));
        }}
        style={{ width: size, height: size }}
        accessibilityRole="image"
        accessibilityHint="Tap the middle to show each group's percentage"
        accessibilityLabel={slices.map((s) => `${s.label} ${pct(s.id)}%`).join(', ')}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surface2} strokeWidth={stroke} fill="none" />
          {/* Turn the ring so the first slice starts at 12 o'clock. */}
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {arcs.map((a) => {
              const visible = Math.max(0, a.len - gap);
              const dim = sel && sel.id !== a.id;
              return (
                <Circle
                  key={a.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={a.color}
                  strokeOpacity={dim ? 0.3 : 1}
                  strokeWidth={sel?.id === a.id ? stroke + 6 : stroke}
                  strokeDasharray={`${visible} ${circ}`}
                  strokeDashoffset={-a.start}
                  fill="none"
                />
              );
            })}
          </G>
          {/* Percent view: each slice's % in the middle of its arc (too-thin slices are left to the legend). */}
          {showPcts
            ? arcs.map((a) => {
                const p = pct(a.id);
                if (p < 5) return null;
                const angle = ((a.start + a.len / 2) / circ) * 2 * Math.PI;
                const x = size / 2 + r * Math.sin(angle);
                const y = size / 2 - r * Math.cos(angle);
                return (
                  <SvgText
                    key={a.id}
                    x={x}
                    y={y + 4.5}
                    textAnchor="middle"
                    fontSize={13}
                    fontFamily="Outfit_800ExtraBold"
                    fill="#FFFFFF"
                    opacity={sel && sel.id !== a.id ? 0.3 : 1}>
                    {`${p}%`}
                  </SvgText>
                );
              })
            : null}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.centerValue, { color: c.text }]}>
            {sel ? `${pct(sel.id)}%` : format(total)}
          </Text>
          <Text style={[styles.centerLabel, { color: c.textDim }]} numberOfLines={1}>
            {sel ? sel.label : totalLabel}
          </Text>
        </View>
      </Pressable>

      <View style={styles.legend}>
        {slices.map((s) => {
          const dim = sel && sel.id !== s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => choose(s.id)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.legendRow,
                { opacity: dim ? 0.45 : 1, backgroundColor: pressed || sel?.id === s.id ? c.surface2 : 'transparent' },
              ]}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text style={[styles.legendLabel, { color: c.text }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={[styles.legendValue, { color: c.textDim }]}>{format(s.value)}</Text>
              <Text style={[styles.legendPct, { color: c.text }]}>{pct(s.id)}%</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16 },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerValue: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  centerLabel: { fontSize: 13, fontWeight: '700' },
  legend: { alignSelf: 'stretch', gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  legendValue: { fontSize: 13, fontWeight: '600' },
  legendPct: { width: 44, textAlign: 'right', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
