import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/text';
import type { Group } from '@/data/groups';
import { compact, niceMax, niceRange } from '@/lib/progress';
import { radius, useColors } from '@/theme';

const AXIS_W = 38;

/** Three recessive gridlines (min, middle, max) with their labels on the left. */
function Grid({ min = 0, max, height }: { min?: number; max: number; height: number }) {
  const c = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, { height }]} pointerEvents="none">
      {[max, (min + max) / 2, min].map((v, i) => (
        <View key={i} style={[styles.gridRow, { top: (i * height) / 2 - 7 }]}>
          <Text style={[styles.axisText, { color: c.textFaint, width: AXIS_W - 6 }]}>{compact(v)}</Text>
          <View style={[styles.gridLine, { backgroundColor: c.border }]} />
        </View>
      ))}
    </View>
  );
}

/**
 * Vertical bars, one per bucket. Tap a bar to see its value; the readout above the chart
 * shows the period total otherwise.
 */
export function BarChart({
  data,
  format,
  totalLabel,
  height = 170,
}: {
  data: { label: string; title: string; value: number; isCurrent?: boolean }[];
  format: (v: number) => string;
  totalLabel: string;
  height?: number;
}) {
  const c = useColors();
  const [selected, setSelected] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const many = data.length > 12;
  const spaced = data.some((d) => !d.label);
  const sel = selected != null ? data[selected] : null;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.readout}>
        <Text style={[styles.readoutLabel, { color: c.textDim }]}>{sel ? sel.title : totalLabel}</Text>
        <Text style={[styles.readoutValue, { color: c.text }]}>
          {format(sel ? sel.value : data.reduce((n, d) => n + d.value, 0))}
        </Text>
      </View>
      <View style={{ height }}>
        <Grid max={max} height={height} />
        <View style={[styles.bars, { left: AXIS_W, height }]}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * height) : 0;
            const isSel = selected === i;
            const dim = selected != null && !isSel;
            return (
              <Pressable
                key={i}
                onPress={() => setSelected(isSel ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}: ${format(d.value)}`}
                style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: c.accent,
                      opacity: dim ? 0.35 : 1,
                      borderTopLeftRadius: many ? 2 : 4,
                      borderTopRightRadius: many ? 2 : 4,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      {/* Labels sit centred under their bar. Long months label every 5th day so they don't collide
          (unless the data already left some labels blank to space them out). */}
      <View style={[styles.xLabels, { marginLeft: AXIS_W }]}>
        {data.map((d, i) =>
          d.label && (spaced || !many || i === 0 || (i + 1) % 5 === 0) ? (
            <Text
              key={i}
              numberOfLines={1}
              style={[
                styles.xLabel,
                {
                  left: `${((i + 0.5) / data.length) * 100}%`,
                  color: d.isCurrent ? c.accent : c.textFaint,
                  fontWeight: d.isCurrent ? '800' : '600',
                },
              ]}>
              {d.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

/**
 * A move's value over time: 2px line with a soft area fill and ≥8px point markers.
 * Tap anywhere on the chart to read the nearest point.
 */
export function LineChart({
  points,
  from,
  to,
  format,
  dateLabel,
  height = 170,
}: {
  points: { date: string; value: number }[];
  from: string;
  to: string;
  format: (v: number) => string;
  dateLabel: (date: string) => string;
  height?: number;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const plotW = Math.max(0, width - AXIS_W - 8);
  const { lo, hi } = niceRange(points.map((p) => p.value));
  const t0 = new Date(from).getTime();
  const span = Math.max(1, new Date(to).getTime() - t0);
  const pad = 8;
  const xy = points.map((p) => ({
    x: AXIS_W + pad + ((new Date(p.date).getTime() - t0) / span) * (plotW - pad * 2),
    y: height - ((p.value - lo) / (hi - lo)) * (height - 6) - 3,
  }));
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = xy.length > 1 ? `${line} L${xy[xy.length - 1].x},${height} L${xy[0].x},${height} Z` : '';
  const sel = selected != null ? points[selected] : points[points.length - 1];
  const first = points[0];

  const pick = (x: number) => {
    if (!xy.length) return;
    let best = 0;
    xy.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(xy[best].x - x)) best = i;
    });
    setSelected(best);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.readout}>
        <Text style={[styles.readoutLabel, { color: c.textDim }]}>
          {sel ? (selected != null ? dateLabel(sel.date) : `Latest · ${dateLabel(sel.date)}`) : 'No data'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[styles.readoutValue, { color: c.text }]}>{sel ? format(sel.value) : '—'}</Text>
          {first && sel && sel !== first && selected == null ? (
            <Text style={[styles.change, { color: c.textDim }]}>
              {sel.value >= first.value ? '▲' : '▼'} {format(Math.abs(sel.value - first.value))} since {dateLabel(first.date)}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => pick(e.nativeEvent.locationX)}
        style={{ height }}>
        <Grid min={lo} max={hi} height={height} />
        {width > 0 ? (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {area ? <Path d={area} fill="url(#area)" /> : null}
            {xy.length > 1 ? (
              <Path d={line} stroke={c.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {selected != null && xy[selected] ? (
              <Line
                x1={xy[selected].x}
                x2={xy[selected].x}
                y1={0}
                y2={height}
                stroke={c.textFaint}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            ) : null}
            {xy.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={selected === i ? 6 : 4.5}
                fill={c.accent}
                stroke={c.surface}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
      </Pressable>
      <View style={[styles.lineX, { marginLeft: AXIS_W }]}>
        <Text style={[styles.lineXLabel, { color: c.textFaint }]}>{dateLabel(from)}</Text>
        <Text style={[styles.lineXLabel, { color: c.textFaint }]}>{dateLabel(to)}</Text>
      </View>
    </View>
  );
}

/** Ranked horizontal bars, one per muscle group, each labelled by name and value. */
export function GroupBars({ rows, unitLabel }: { rows: { group: Group; sets: number }[]; unitLabel: string }) {
  const c = useColors();
  const max = Math.max(1, ...rows.map((r) => r.sets));
  return (
    <View style={{ gap: 10 }}>
      {rows.map(({ group, sets }) => (
        <View key={group.id} style={styles.groupRow}>
          <View style={styles.groupName}>
            <View style={[styles.dot, { backgroundColor: group.color }]} />
            <Text style={[styles.groupText, { color: c.text }]} numberOfLines={1}>
              {group.name}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.surface2 }]}>
            <View style={[styles.groupBar, { width: `${(sets / max) * 100}%`, backgroundColor: group.color }]} />
          </View>
          <Text style={[styles.groupValue, { color: c.textDim }]}>
            {sets} {unitLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** A headline number with an optional comparison line. */
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.tileLabel, { color: c.textDim }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text style={[styles.tileSub, { color: c.textFaint }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { gap: 1 },
  readoutLabel: { fontSize: 12, fontWeight: '700' },
  readoutValue: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  change: { fontSize: 13, fontWeight: '600' },
  gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  axisText: { fontSize: 10, fontWeight: '600', textAlign: 'right', marginRight: 6 },
  gridLine: { flex: 1, height: StyleSheet.hairlineWidth },
  bars: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  xLabels: { height: 14 },
  xLabel: { position: 'absolute', width: 28, marginLeft: -14, fontSize: 10, textAlign: 'center' },
  lineX: { flexDirection: 'row', justifyContent: 'space-between' },
  lineXLabel: { fontSize: 10, fontWeight: '600' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupName: { width: 92, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  groupText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  groupBar: { height: '100%', borderRadius: 5 },
  groupValue: { width: 58, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  tile: { flex: 1, minWidth: '45%', borderRadius: radius.md, borderWidth: 1, padding: 12, gap: 2 },
  tileLabel: { fontSize: 12, fontWeight: '700' },
  tileValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileSub: { fontSize: 12 },
});
