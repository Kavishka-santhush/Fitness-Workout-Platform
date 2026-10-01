import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polygon, Polyline, Rect } from 'react-native-svg';
import { Text } from './Text';
import { colors, spacing } from '@/lib/theme';

// --- TrendChart ------------------------------------------------------------
interface TrendChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  showGrid?: boolean;
}

/** Lightweight SVG sparkline / trend chart (no external charting dep). */
export function TrendChart({
  data,
  width = 300,
  height = 120,
  color = colors.primary,
  area = true,
  showGrid = true,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return <View style={{ width, height, backgroundColor: colors.surface, borderRadius: 8 }} />;
  }
  const pad = 6;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = points.map((p) => `${p[0]},${p[1]}`).join(' ');
  const areaPoly = `${pad},${height - pad} ${line} ${pad + (data.length - 1) * stepX},${height - pad}`;

  return (
    <Svg width={width} height={height}>
      {showGrid ? (
        <>
          <Line x1={pad} y1={pad} x2={width - pad} y2={pad} stroke={colors.border} strokeWidth={0.5} />
          <Line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke={colors.border} strokeWidth={0.5} />
          <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={colors.border} strokeWidth={0.5} />
        </>
      ) : null}
      {area ? <Polygon points={areaPoly} fill={color} fillOpacity={0.15} stroke="none" /> : null}
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// --- BarChart --------------------------------------------------------------
interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

/** Vertical bars with baseline; labels omitted for compactness. */
export function BarChart({ data, height = 140, color = colors.primary }: BarChartProps) {
  const width = 320;
  const pad = 6;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (width - pad * 2) / Math.max(1, data.length);
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const h = (height - pad * 2) * (d.value / max);
        return (
          <Rect
            key={d.label + i}
            x={pad + i * bw + bw * 0.15}
            y={height - pad - h}
            width={bw * 0.7}
            height={Math.max(1, h)}
            rx={3}
            fill={color}
          />
        );
      })}
    </Svg>
  );
}

// --- MacroBar --------------------------------------------------------------
interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

const MacroSegment = ({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) => {
  const pct = goal ? Math.min(1, value / goal) : 0;
  return (
    <View style={{ flex: 1, marginLeft: label === 'Protein' ? 0 : spacing.md }}>
      <View style={styles.macroHead}>
        <Text variant="caption" style={{ color }}>
          {label}
        </Text>
        <Text variant="caption">
          {Math.round(value)}/{Math.round(goal)}g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
};

/** Protein / carbs / fat progress bars stacked side by side. */
export function MacroBar({ protein, carbs, fat, proteinGoal, carbsGoal, fatGoal }: MacroBarProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <MacroSegment label="Protein" value={protein} goal={proteinGoal} color={colors.protein} />
      <MacroSegment label="Carbs" value={carbs} goal={carbsGoal} color={colors.carbs} />
      <MacroSegment label="Fat" value={fat} goal={fatGoal} color={colors.fat} />
    </View>
  );
}

const styles = StyleSheet.create({
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroTrack: { height: 8, backgroundColor: colors.elevated, borderRadius: 4, overflow: 'hidden' },
});
