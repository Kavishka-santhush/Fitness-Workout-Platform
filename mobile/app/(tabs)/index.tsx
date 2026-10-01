import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ActivityRings, MacroRing } from '@/components/ui/rings';
import { LoadingRow } from '@/components/ui/Feedback';
import { WorkoutCard } from '@/components/cards';
import { colors, spacing, radius } from '@/lib/theme';
import { formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useSessionStore } from '@/store/session';
import { syncAndReadToday } from '@/lib/health';
import { useAiQuote, useDashboard, useScheduleToday } from '@/hooks/queries';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Home dashboard — greets the member, shows activity rings, today's workout,
 * the calorie ring, a quick-log row, the upcoming class, and a rotating AI
 * motivational quote pulled from the backend.
 */
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const units = useSettings((s) => s.units);
  const stepGoal = useSettings((s) => s.stepGoal);
  const moveGoal = useSettings((s) => s.moveGoal);
  const activeSession = useSessionStore((s) => s.active);

  const { data: dash, isLoading } = useDashboard();
  const { data: quote } = useAiQuote();
  const { data: schedule } = useScheduleToday();

  const [activity, setActivity] = React.useState<{ steps: number; activeCalories: number }>({
    steps: dash?.activity?.steps ?? 0,
    activeCalories: dash?.activity?.activeCalories ?? 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      syncAndReadToday()
        .then((a) => {
          if (!cancelled && a) setActivity({ steps: a.steps, activeCalories: a.activeCalories });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const nutrition = dash?.nutritionToday ?? { calories: 0, target: 2200 };
  const exerciseMinutes = dash?.stats?.workoutsThisWeek ? 30 : 0;
  const rings = [
    { progress: moveGoal ? activity.activeCalories / moveGoal : 0, color: colors.danger },
    { progress: 220 ? Math.min(1, exerciseMinutes / 220) : 0, color: colors.success },
    { progress: stepGoal ? activity.steps / stepGoal : 0, color: colors.info },
  ];

  if (isLoading) return <LoadingRow label="Loading your day…" />;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <Text variant="muted">{greeting()},</Text>
          <Text variant="h1">{user?.displayName?.split(' ')[0] ?? 'Athlete'} 👋</Text>
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={15} color={colors.warning} />
            <Text variant="label" color="warning">
              {dash?.stats?.streak ?? user?.streakCurrent ?? 0} day streak
            </Text>
            <Text variant="caption" style={{ marginLeft: spacing.md }}>
              Lvl {user?.level ?? 1} · {formatNumber(user?.xpPoints)} XP
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Activity rings + rings legend */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.ringsWrap}>
          <ActivityRings rings={rings} size={150} strokeWidth={15} />
          <View style={{ marginLeft: spacing.lg, flex: 1 }}>
            <LegendRow color={colors.danger} label="Move" value={`${formatNumber(activity.activeCalories)} kcal`} goal={`of ${formatNumber(moveGoal)}`} />
            <LegendRow color={colors.success} label="Exercise" value={`${exerciseMinutes} min`} goal="of 30" />
            <LegendRow color={colors.info} label="Steps" value={formatNumber(activity.steps)} goal={`of ${formatNumber(stepGoal)}`} />
          </View>
        </View>
      </Card>

      {/* Today's workout */}
      <SectionHeader title="Today's Workout" icon="calendar-outline" actionLabel="All workouts" onAction={() => router.push('/(tabs)/workout')} />
      {dash?.todayWorkout ? (
        <WorkoutCard
          workout={dash.todayWorkout}
          onPress={() => router.push(`/workout/${dash.todayWorkout.id}`)}
        />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Ionicons name="barbell-outline" size={30} color={colors.faint} />
          <Text variant="muted" center style={{ marginVertical: spacing.sm }}>
            No workout scheduled today.
          </Text>
          <Button label="Quick workout" icon="flash" onPress={() => router.push('/session/active')} />
        </Card>
      )}

      {/* Resume banner if a session is mid-workout */}
      {activeSession ? (
        <Card onPress={() => router.push('/session/active')} style={{ marginTop: spacing.md, borderColor: colors.primary }}>
          <View style={styles.resumeRow}>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="label" color="primary">
                Session in progress
              </Text>
              <Text variant="title">{activeSession.workoutName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </View>
        </Card>
      ) : null}

      {/* Nutrition ring */}
      <SectionHeader title="Nutrition" icon="nutrition-outline" actionLabel="Log food" onAction={() => router.push('/nutrition/log')} />
      <Card>
        <View style={styles.nutritionRow}>
          <MacroRing used={nutrition.calories ?? 0} goal={nutrition.target ?? 2200} size={116} />
          <View style={{ flex: 1, marginLeft: spacing.lg, gap: spacing.sm }}>
            <MacroLine label="Protein" value={nutrition.proteinG ?? 0} unit="g" color={colors.protein} />
            <MacroLine label="Carbs" value={nutrition.carbsG ?? 0} unit="g" color={colors.carbs} />
            <MacroLine label="Fat" value={nutrition.fatG ?? 0} unit="g" color={colors.fat} />
            <Button size="sm" variant="outline" icon="barcode-outline" label="Scan barcode" onPress={() => router.push('/nutrition/scan')} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      </Card>

      {/* Quick log grid */}
      <SectionHeader title="Quick Log" icon="add-circle-outline" />
      <View style={styles.quickGrid}>
        <QuickAction icon="barbell" label="Workout" onPress={() => router.push('/(tabs)/workout')} />
        <QuickAction icon="walk" label="Cardio" onPress={() => router.push('/cardio')} />
        <QuickAction icon="restaurant" label="Meal" onPress={() => router.push('/nutrition/log')} />
        <QuickAction icon="scale" label="Weight" onPress={() => router.push('/(tabs)/progress')} />
        <QuickAction icon="water" label="Water" onPress={() => router.push('/(tabs)/nutrition')} />
        <QuickAction icon="chatbubbles" label="Coach" onPress={() => router.push('/ai-coach')} />
      </View>

      {/* Upcoming class */}
      {dash?.upcomingClass || schedule?.length ? (
        <>
          <SectionHeader title="Up Next" icon="videocam-outline" actionLabel="Classes" onAction={() => router.push('/classes')} />
          <ClassTeaser item={dash?.upcomingClass ?? schedule?.[0]} />
        </>
      ) : null}

      {/* AI quote */}
      <SectionHeader title="Daily Motivation" icon="sparkles-outline" />
      <Card elevated style={{ marginBottom: spacing.xl }}>
        <Ionicons name="chatbox-ellipses" size={22} color={colors.primary} />
        <Text variant="body" style={{ marginTop: spacing.sm, fontStyle: 'italic' }}>
          {quote?.quote ?? 'The body achieves what the mind believes.'}
        </Text>
        {quote?.author ? (
          <Text variant="caption" style={{ marginTop: 6 }}>
            — {quote.author}
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function LegendRow({ color, label, value, goal }: { color: string; label: string; value: string; goal: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="label" style={{ width: 62 }}>
        {label}
      </Text>
      <Text variant="title" style={{ fontSize: 15 }}>
        {value}
      </Text>
      <Text variant="caption" style={{ marginLeft: 4 }}>
        {goal}
      </Text>
    </View>
  );
}

function MacroLine({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroLine}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="title" style={{ fontSize: 15 }}>
        {Math.round(value)}
        {unit}
      </Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.8 }]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function ClassTeaser({ item }: { item: any }) {
  if (!item) return null;
  return (
    <Card onPress={() => router.push(`/classes/${item.id}`)}>
      <View style={styles.resumeRow}>
        <View style={[styles.quickIcon, { backgroundColor: `${colors.danger}22` }]}>
          <Ionicons name={item.status === 'LIVE' ? 'radio' : 'videocam'} size={20} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption">
            {item.trainer?.displayName ?? item.coachName ?? 'Coach'} ·{' '}
            {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Scheduled'}
          </Text>
        </View>
        {item.status === 'LIVE' ? <Badge label="Live" tone="danger" /> : <Badge label={`${item.durationMin}m`} tone="muted" />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ringsWrap: { flexDirection: 'row', alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  nutritionRow: { flexDirection: 'row', alignItems: 'center' },
  macroLine: { flexDirection: 'row', alignItems: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickAction: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
