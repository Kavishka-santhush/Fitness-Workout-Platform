import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { mmss } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { scheduleLocal } from '@/lib/push';
import { useSessionStore, type LoggedSet, type PlannedExercise } from '@/store/session';
import { useCompleteSession, useLogSet, usePauseSession, useResumeSession, useStartSession, useWorkout, useWorkouts } from '@/hooks/queries';

/**
 * Live workout runner.
 *
 * - When no session is active it presents a picker to start one (saved workout
 *   or an ad-hoc quick workout).
 * - While running it ticks a clock, lets the user log each planned set (reps /
 *   weight / duration), fires a rest timer with haptic + local-notification
 *   completion, and buffers everything in the persisted session store so it
 *   survives app closes and offline gaps.
 */
export default function ActiveSessionScreen() {
  const active = useSessionStore((s) => s.active);
  if (!active) return <StartRunner />;
  return <Runner sessionId={active.sessionId} />;
}

// ---------------------------------------------------------------------------
// Start screen (no active session)
// ---------------------------------------------------------------------------
function StartRunner() {
  const workouts = useWorkouts('');
  const start = useStartSession();
  const begin = useSessionStore((s) => s.begin);
  const list: any[] = workouts.data?.items ?? workouts.data ?? [];

  function launch(workout: any) {
    const exercises: PlannedExercise[] = (workout.exercises ?? []).map((we: any) => ({
      id: we.exerciseId ?? we.exercise?.id,
      name: we.exercise?.name ?? 'Exercise',
      sets: we.sets ?? 3,
      reps: we.reps ?? null,
      weight: we.weight ?? null,
      restSec: we.restSec ?? 90,
    }));
    start.mutate(
      { workoutId: workout.id, name: workout.name },
      {
        onSuccess: (res: any) => {
          const sessionId = res?.id ?? res?.sessionId ?? `local-${Date.now()}`;
          begin({
            sessionId,
            workoutId: workout.id,
            workoutName: workout.name,
            exerciseIds: exercises.map((e) => e.id),
            exercises,
          });
        },
      }
    );
  }

  function quick() {
    start.mutate(
      { name: 'Quick Workout' },
      {
        onSuccess: (res: any) => {
          const sessionId = res?.id ?? res?.sessionId ?? `local-${Date.now()}`;
          begin({ sessionId, workoutId: '', workoutName: 'Quick Workout', exerciseIds: [], exercises: [] });
        },
      }
    );
  }

  return (
    <View style={styles.root}>
      <Text variant="h1" style={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        Start a workout
      </Text>
      <Button label="Quick workout" icon="flash" size="lg" fullWidth onPress={quick} loading={start.isPending} style={{ marginBottom: spacing.md }} />
      {workouts.isLoading ? (
        <LoadingRow />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {Array.isArray(list) && list.length ? (
            list.slice(0, 12).map((w) => (
              <Card key={w.id} onPress={() => launch(w)} style={{ marginBottom: spacing.sm }}>
                <View style={styles.pickRow}>
                  <View style={styles.pickIcon}>
                    <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text variant="caption">
                      {(w.exercises ?? []).length} exercises · {w.estimatedDuration ?? '—'} min
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon="barbell-outline" title="No saved workouts" message="Start a quick workout or build one from the Train tab." />
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Runner (active session)
// ---------------------------------------------------------------------------
function Runner({ sessionId }: { sessionId: string }) {
  const active = useSessionStore((s) => s.active)!;
  const upsertSet = useSessionStore((s) => s.upsertSet);
  const getSet = useSessionStore((s) => s.getSet);
  const tick = useSessionStore((s) => s.tick);
  const togglePause = useSessionStore((s) => s.togglePause);
  const setIndex = useSessionStore((s) => s.setIndex);
  const startRest = useSessionStore((s) => s.startRest);
  const endRest = useSessionStore((s) => s.endRest);
  const clear = useSessionStore((s) => s.clear);

  const logSet = useLogSet(sessionId);
  const pause = usePauseSession(sessionId);
  const resume = useResumeSession(sessionId);
  const complete = useCompleteSession(sessionId);

  // For server-backed workouts, hydrate exercises lazily if the snapshot is empty.
  const { data: liveWorkout } = useWorkout(active.workoutId || '');
  const exercises: PlannedExercise[] =
    active.exercises.length > 0
      ? active.exercises
      : (liveWorkout?.exercises ?? []).map((we: any) => ({
          id: we.exerciseId ?? we.exercise?.id,
          name: we.exercise?.name ?? 'Exercise',
          sets: we.sets ?? 3,
          reps: we.reps ?? null,
          weight: we.weight ?? null,
          restSec: we.restSec ?? 90,
        }));

  // Clock.
  React.useEffect(() => {
    const id = setInterval(() => tick(1), 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <View style={styles.root}>
      {/* Header: name + clock + pause */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="label" color="primary">
            {active.workoutName}
          </Text>
          <Text variant="h2">{mmss(active.elapsedSec)}</Text>
        </View>
        <Pressable
          onPress={() => {
            togglePause();
            active.paused ? resume.mutate() : pause.mutate();
            haptics.selection();
          }}
          hitSlop={10}
        >
          <Ionicons name={active.paused ? 'play' : 'pause'} size={24} color={active.paused ? colors.primary : colors.text} />
        </Pressable>
      </View>

      {active.paused ? (
        <View style={styles.pausedBanner}>
          <Ionicons name="pause-circle" size={18} color={colors.warning} />
          <Text variant="label" color="warning" style={{ marginLeft: 8 }}>
            Paused — tap play to resume
          </Text>
        </View>
      ) : null}

      {/* Exercise stepper */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {exercises.length === 0 ? (
          <QuickLogger sessionId={sessionId} />
        ) : (
          exercises.map((ex, idx) => (
            <ExerciseBlock
              key={ex.id + idx}
              exercise={ex}
              index={idx}
              currentIndex={active.currentExerciseIndex}
              isDone={idx < active.currentExerciseIndex}
              onFocus={() => setIndex(idx)}
              getSet={getSet}
              onLog={(logged) => {
                upsertSet(logged);
                logSet.mutate({ exerciseId: logged.exerciseId, setNumber: logged.setNumber, reps: logged.reps, weight: logged.weight, durationSec: logged.durationSec, rpe: logged.rpe });
                haptics.medium();
                if (ex.restSec > 0) {
                  startRest(ex.restSec);
                  scheduleLocal('Rest complete', `Get ready for your next set of ${ex.name}`, ex.restSec, 'rest');
                }
              }}
              onAdvance={() => setIndex(Math.min(exercises.length - 1, idx + 1))}
            />
          ))
        )}
      </ScrollView>

      {/* Rest overlay */}
      {active.restUntil ? <RestOverlay endRest={endRest} /> : null}

      {/* Finish bar */}
      <View style={styles.finishBar}>
        <Button
          label="Finish"
          icon="checkmark-done"
          size="lg"
          variant="primary"
          loading={complete.isPending}
          style={{ flex: 1 }}
          onPress={() =>
            Alert.alert('Finish workout?', 'Your logged sets will be saved.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Save & finish',
                onPress: () => complete.mutate(undefined as any, { onSuccess: () => { haptics.success(); clear(); router.replace('/(tabs)'); } }),
              },
            ])
          }
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// One exercise with its set rows
// ---------------------------------------------------------------------------
function ExerciseBlock({
  exercise,
  index,
  currentIndex,
  isDone,
  onFocus,
  getSet,
  onLog,
  onAdvance,
}: {
  exercise: PlannedExercise;
  index: number;
  currentIndex: number;
  isDone: boolean;
  onFocus: () => void;
  getSet: (exerciseId: string, setNumber: number) => LoggedSet | undefined;
  onLog: (set: LoggedSet) => void;
  onAdvance: () => void;
}) {
  const expanded = index === currentIndex;
  const [reps, setReps] = React.useState('');
  const [weight, setWeight] = React.useState('');

  React.useEffect(() => {
    if (expanded) {
      const last = getSet(exercise.id, exercise.sets);
      if (last) {
        setReps(last.reps ? String(last.reps) : '');
        setWeight(last.weight ? String(last.weight) : '');
      }
    }
  }, [expanded, exercise.id]);

  const loggedCount = Array.from({ length: exercise.sets }).filter((_, i) => getSet(exercise.id, i + 1)?.done).length;

  function logNext() {
    const next = loggedCount + 1;
    if (next > exercise.sets) {
      onAdvance();
      return;
    }
    onLog({
      exerciseId: exercise.id,
      setNumber: next,
      reps: reps ? Number(reps) : undefined,
      weight: weight ? Number(weight) : undefined,
      done: true,
    });
  }

  return (
    <Card style={{ marginBottom: spacing.sm, borderColor: isDone ? colors.primary : expanded ? colors.border : `${colors.border}88` }} onPress={onFocus}>
      <View style={styles.exHead}>
        <View style={[styles.exNum, isDone && { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 13 }}>{isDone ? '✓' : index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text variant="caption">
            {exercise.sets} sets · {exercise.reps ?? '—'} reps {exercise.weight ? `· ${exercise.weight}kg` : ''} · rest {Math.round(exercise.restSec / 10) * 10}s
          </Text>
        </View>
        <Badge label={`${loggedCount}/${exercise.sets}`} tone={loggedCount >= exercise.sets ? 'success' : 'muted'} />
      </View>

      {expanded ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.inputRow}>
            <Input keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="Reps" containerStyle={{ flex: 1, marginRight: spacing.sm }} />
            <Input keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="Weight" containerStyle={{ flex: 1 }} />
          </View>
          <Button label={loggedCount >= exercise.sets ? 'Go to next exercise' : `Log set ${loggedCount + 1}`} icon="add" onPress={loggedCount >= exercise.sets ? onAdvance : logNext} fullWidth variant={loggedCount >= exercise.sets ? 'secondary' : 'primary'} />
        </View>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rest timer countdown overlay
// ---------------------------------------------------------------------------
function RestOverlay({ endRest }: { endRest: () => void }) {
  const restUntil = useSessionStore((s) => s.active?.restUntil);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remaining = restUntil ? Math.max(0, (restUntil - now) / 1000) : 0;
  React.useEffect(() => {
    if (remaining <= 0 && restUntil) {
      haptics.heavy();
      endRest();
    }
  }, [remaining, restUntil, endRest]);

  if (!restUntil) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.restBackdrop}>
        <Text variant="label">REST</Text>
        <Text variant="h1" style={{ fontSize: 72, color: colors.primary, marginVertical: spacing.md }}>
          {mmss(remaining)}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="+15s" variant="outline" onPress={() => useSessionStore.getState().startRest(Math.round(remaining) + 15)} />
          <Button label="Skip" variant="ghost" onPress={endRest} />
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Free-form logger for quick workouts (no planned exercises)
// ---------------------------------------------------------------------------
function QuickLogger({ sessionId }: { sessionId: string }) {
  const upsertSet = useSessionStore((s) => s.upsertSet);
  const logSet = useLogSet(sessionId);
  const [name, setName] = React.useState('');
  const [reps, setReps] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [entries, setEntries] = React.useState<string[]>([]);

  function add() {
    if (!name.trim()) return;
    const exId = `quick-${Date.now()}`;
    upsertSet({ exerciseId: exId, setNumber: 1, reps: reps ? Number(reps) : undefined, weight: weight ? Number(weight) : undefined, done: true });
    logSet.mutate({ exerciseId: exId, exerciseName: name.trim(), reps: reps ? Number(reps) : undefined, weight: weight ? Number(weight) : undefined, quick: true });
    setEntries((e) => [`${name.trim()} · ${reps || '—'} reps · ${weight || '—'}kg`, ...e]);
    setName('');
    setReps('');
    setWeight('');
    haptics.medium();
  }

  return (
    <Card>
      <Text variant="h3">Quick log</Text>
      <Text variant="caption" style={{ marginBottom: spacing.md }}>
        Add exercises on the fly (session {sessionId.slice(0, 8)}…).
      </Text>
      <Input label="Exercise" value={name} onChangeText={setName} placeholder="e.g. Bench Press" />
      <View style={styles.inputRow}>
        <Input keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="Reps" containerStyle={{ flex: 1, marginRight: spacing.sm }} />
        <Input keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="Weight" containerStyle={{ flex: 1 }} />
      </View>
      <Button label="Log set" icon="add" onPress={add} fullWidth />
      {entries.map((e, i) => (
        <View key={i} style={styles.quickEntry}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text variant="body" style={{ marginLeft: 8 }}>
            {e}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  pausedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.warning}22`, paddingVertical: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center' },
  pickIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  exHead: { flexDirection: 'row', alignItems: 'center' },
  exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  inputRow: { flexDirection: 'row', marginBottom: spacing.xs },
  finishBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  restBackdrop: { flex: 1, backgroundColor: `${colors.black}cc`, alignItems: 'center', justifyContent: 'center' },
  quickEntry: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
});
