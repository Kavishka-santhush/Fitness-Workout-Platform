import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingRow, ProgressBar, StatCard } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatMoney } from '@/lib/utils';
import { api } from '@/lib/api';
import { useEnrollProgram, useProgram, useUnenrollProgram } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

/**
 * Program detail: creator, marketplace info, week-by-week workout breakdown and
 * enrolment state. Paid programs route the athlete to the plan screen.
 */
export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: program, isLoading } = useProgram(id ?? '');
  const enroll = useEnrollProgram(id ?? '');
  const unenroll = useUnenrollProgram(id ?? '');
  const [board, setBoard] = React.useState<any[] | null>(null);

  if (isLoading) return <LoadingRow label="Loading program…" />;
  if (!program) return <EmptyState icon="layers-outline" title="Program not found" />;

  const enrolled = !!program.enrollment;
  const workouts: any[] = program.workouts ?? [];
  const weeks = Array.from(new Set(workouts.map((w) => w.week ?? 1))).sort((a, b) => a - b);
  const pct = enrolled && program.enrollment.progressPct != null
    ? Number(program.enrollment.progressPct) / 100
    : 0;

  function loadLeaderboard() {
    if (board) return;
    void api.get(`/programs/${program.id}/leaderboard?limit=10`).then((r: any) => {
      const payload = r?.data?.data ?? r?.data ?? [];
      setBoard(Array.isArray(payload) ? payload : payload.items ?? []);
    });
  }

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text variant="h1">{program.name}</Text>
      {program.description ? (
        <Text variant="muted" style={{ marginTop: 6 }}>
          {program.description}
        </Text>
      ) : null}

      <View style={styles.creator}>
        <Avatar uri={program.creator?.avatarUrl} name={program.creator?.displayName} size={40} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text variant="title" style={{ fontSize: 15 }}>
            {program.creator?.displayName ?? 'FitForge coach'}
          </Text>
          <View style={styles.inlineRow}>
            <Text variant="caption">{program.programType ?? program.goal}</Text>
            {program.creator?.trainerProfile?.verificationStatus === 'VERIFIED' ? (
              <Ionicons name="checkmark-circle" size={14} color={colors.info} />
            ) : null}
          </View>
        </View>
        {program.featured ? <Badge label="Featured" tone="warning" icon="ribbon" /> : null}
      </View>

      <View style={styles.badgeRow}>
        <Badge label={program.difficulty ?? 'BEGINNER'} tone="default" icon="speedometer-outline" />
        <Badge label={program.goal?.replace(/_/g, ' ') ?? 'General'} tone="muted" />
        {program.priceCents ? <Badge label={formatMoney(program.priceCents)} tone="info" icon="pricetag" /> : <Badge label="Free" tone="success" />}
      </View>

      <View style={styles.statRow}>
        <StatCard icon="calendar-outline" label="Duration" value={`${program.durationWeeks} wks`} />
        <StatCard icon="repeat-outline" label="Per week" value={`${program.daysPerWeek} days`} />
        <StatCard icon="people-outline" label="Enrolled" value={String(program.enrollmentCount ?? program._count?.enrollments ?? 0)} />
      </View>

      {enrolled ? (
        <Card style={{ borderColor: colors.primary }}>
          <View style={styles.inlineRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text variant="title" style={{ fontSize: 15, flex: 1 }}>
              You're enrolled
            </Text>
            <Text variant="label">{Math.round(pct * 100)}%</Text>
          </View>
          <ProgressBar value={pct} style={{ marginTop: spacing.sm }} />
        </Card>
      ) : null}

      {(program.equipment ?? []).length ? (
        <>
          <SectionHeader title="Equipment" icon="cube-outline" />
          <View style={styles.badgeRow}>
            {program.equipment.map((e: string) => (
              <Badge key={e} label={e} tone="muted" />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Weekly Breakdown" icon="calendar-number-outline" subtitle={`${workouts.length} workouts`} />
      {workouts.length ? (
        weeks.map((week: any) => (
          <View key={week} style={{ marginBottom: spacing.md }}>
            <Text variant="label" style={{ marginBottom: spacing.sm }}>
              Week {week}
            </Text>
            {workouts
              .filter((w) => (w.week ?? 1) === week)
              .map((pw: any) => {
                const names: string[] = (pw.workout?.exercises ?? []).map((we: any) => we.exercise?.name).filter(Boolean);
                return (
                  <Card key={pw.id ?? pw.workoutId} style={{ marginBottom: spacing.sm }}>
                    <View style={styles.exRow}>
                      <View style={styles.dayBadge}>
                        <Text variant="caption" bold>
                          D{pw.dayOfWeek ?? 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="title" numberOfLines={1} style={{ fontSize: 15 }}>
                          {pw.workout?.name ?? 'Rest / flexible day'}
                        </Text>
                        <Text variant="caption" numberOfLines={2}>
                          {names.length ? names.slice(0, 5).join(' · ') : 'No exercises listed'}
                        </Text>
                      </View>
                      {pw.workout?.id ? (
                        <Ionicons name="chevron-forward" size={18} color={colors.faint} onPress={() => router.push(`/workout/${pw.workout.id}`)} />
                      ) : null}
                    </View>
                  </Card>
                );
              })}
          </View>
        ))
      ) : (
        <EmptyState icon="body-outline" title="No workouts yet" message="This program has no published breakdown." />
      )}

      <SectionHeader title="Program Leaders" icon="trophy-outline" actionLabel="Load" onAction={loadLeaderboard} />
      {board === null ? (
        <Text variant="caption">Tap load to see how other athletes are progressing.</Text>
      ) : board.length ? (
        board.slice(0, 10).map((row: any, i: number) => (
          <View key={row.userId ?? i} style={styles.boardRow}>
            <Text variant="label" style={{ width: 26 }}>
              {row.rank ?? i + 1}
            </Text>
            <Avatar uri={row.avatarUrl} name={row.name ?? row.displayName} size={28} />
            <Text variant="body" style={{ flex: 1, fontSize: 14, marginHorizontal: spacing.sm }} numberOfLines={1}>
              {row.name ?? row.displayName ?? 'Athlete'}
            </Text>
            <Text variant="caption">{row.progress != null ? `${row.progress}%` : row.completed ?? ''}</Text>
          </View>
        ))
      ) : (
        <Text variant="caption">Nobody on the board yet — be the first.</Text>
      )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {enrolled ? (
          <>
            <Button label="Continue program" icon="play" size="lg" style={{ flex: 2 }} onPress={() => router.push('/session/active')} />
            <Button
              label="Quit"
              icon="close"
              variant="ghost"
              loading={unenroll.isPending}
              onPress={() => unenroll.mutate(undefined, { onSuccess: () => haptics.light() })}
              style={{ flex: 1 }}
            />
          </>
        ) : program.priceCents ? (
          <Button
            label={`Unlock for ${formatMoney(program.priceCents)}`}
            icon="lock-open-outline"
            size="lg"
            fullWidth
            onPress={() => router.push('/pricing')}
          />
        ) : (
          <Button
            label="Enroll for free"
            icon="checkmark-circle-outline"
            size="lg"
            fullWidth
            loading={enroll.isPending}
            onPress={() => enroll.mutate(undefined, { onSuccess: () => haptics.success() })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  creator: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginHorizontal: 0 },
  exRow: { flexDirection: 'row', alignItems: 'center' },
  dayBadge: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
