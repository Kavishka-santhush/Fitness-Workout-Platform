import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingRow, EmptyState } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatNumber } from '@/lib/utils';
import { useStartSession, useWorkout } from '@/hooks/queries';
import { useSessionStore, type PlannedExercise } from '@/store/session';
import { haptics } from '@/lib/haptics';

/**
 * Workout detail: overview stats and the planned exercise list, with a Start
 * action that opens a server session, snapshots the plan into the offline
 * session store, and drops into the live runner.
 */
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isLoading } = useWorkout(id ?? '');
  const start = useStartSession();
  const begin = useSessionStore((s) => s.begin);

  if (isLoading) return <LoadingRow label="Loading workout…" />;
  if (!workout) return <EmptyState icon="barbell-outline" title="Workout not found" />;

  const exercises: PlannedExercise[] = (workout.exercises ?? []).map((we: any) => ({
    id: we.exerciseId ?? we.exercise?.id,
    name: we.exercise?.name ?? 'Exercise',
    sets: we.sets ?? 3,
    reps: we.reps ?? null,
    weight: we.weight ?? null,
    restSec: we.restSec ?? 90,
  }));

  function handleStart() {
    start.mutate(
      { workoutId: workout.id, name: workout.name },
      {
        onSuccess: (res: any) => {
          haptics.medium();
          const sessionId = res?.id ?? res?.sessionId ?? `local-${Date.now()}`;
          begin({ sessionId, workoutId: workout.id, workoutName: workout.name, exerciseIds: exercises.map((e) => e.id), exercises });
          router.push('/session/active');
        },
      }
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="h1">{workout.name}</Text>
            {workout.description ? (
              <Text variant="muted" style={{ marginTop: 6 }}>
                {workout.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Badge label={workout.difficulty ?? 'Any'} tone="default" icon="speedometer-outline" />
          {workout.tags?.slice(0, 3).map((t: string) => (
            <Badge key={t} label={t} tone="muted" />
          ))}
        </View>

        <View style={styles.statRow}>
          <Stat icon="list-outline" label="Exercises" value={String(exercises.length)} />
          <Stat icon="time-outline" label="Duration" value={`${workout.estimatedDuration ?? '—'} min`} />
          <Stat icon="flame-outline" label="Burn" value={`${workout.estimatedCalories ?? '—'} kcal`} />
        </View>

        <SectionHeader title="Planned Exercises" icon="barbell-outline" />
        {exercises.length ? (
          exercises.map((e, i) => (
            <Card key={e.id + i} style={{ marginBottom: spacing.sm }}>
              <View style={styles.exRow}>
                <View style={styles.exNum}>
                  <Text style={{ color: colors.white, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title" numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text variant="caption">
                    {e.sets} × {e.reps ?? '—'} {e.weight ? `· ${e.weight}kg` : ''}
                  </Text>
                </View>
                <Text variant="caption">{formatNumber(e.restSec)}s rest</Text>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState icon="body-outline" title="No exercises yet" message="This workout is empty." />
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button label="Start workout" icon="play" size="lg" fullWidth loading={start.isPending} onPress={handleStart} />
      </View>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text variant="h3" style={{ marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  exRow: { flexDirection: 'row', alignItems: 'center' },
  exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
