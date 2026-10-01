import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text } from './Text';
import { colors } from '@/lib/theme';

// --- ProgressRing ----------------------------------------------------------
interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = colors.primary,
  trackColor = colors.elevated,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circ * (1 - clamped);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
        />
      </Svg>
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}

// --- ActivityRings ---------------------------------------------------------
interface Ring {
  progress: number;
  color: string;
}

interface ActivityRingsProps {
  rings: Ring[]; // e.g. [Move, Exercise, Steps] inner→outer
  size?: number;
  strokeWidth?: number;
  gap?: number;
}

/**
 * Apple-Watch-style concentric activity rings rendered as rotated SVG strokes.
 * Rings are drawn outer→inner so the smaller ones sit on top.
 */
export function ActivityRings({ rings, size = 160, strokeWidth = 16, gap = 6 }: ActivityRingsProps) {
  return (
    <Svg width={size} height={size}>
      {rings.map((ring, i) => {
        const r = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap);
        if (r <= 0) return null;
        const circ = 2 * Math.PI * r;
        const clamped = Math.max(0, Math.min(1, ring.progress));
        return (
          <G key={i} rotation={-90} originX={size / 2} originY={size / 2}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${ring.color}33`} strokeWidth={strokeWidth} fill="none" />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={ring.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={circ * (1 - clamped)}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// --- MacroRing -------------------------------------------------------------
interface MacroRingProps {
  used: number;
  goal: number;
  size?: number;
}

/** Calorie ring with remaining-in-the-centre label — used on Home + Nutrition. */
export function MacroRing({ used, goal, size = 132 }: MacroRingProps) {
  const remaining = Math.max(0, goal - used);
  return (
    <ProgressRing progress={goal ? used / goal : 0} size={size} color={colors.primary}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="h2">{Math.round(remaining)}</Text>
        <Text variant="caption">kcal left</Text>
        <Text variant="caption" color="muted">
          / {Math.round(goal)}
        </Text>
      </View>
    </ProgressRing>
  );
}
