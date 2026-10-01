import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/Feedback';
import { BarChart, TrendChart } from '@/components/ui/charts';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/lib/theme';
import { formatNumber, formatDate } from '@/lib/utils';
import { useSettings, formatWeight } from '@/store/settings';
import { useAddBodyStat, useCurrentBodyStat, useDashboard, usePersonalRecords, useWeightChart, useWorkoutChart } from '@/hooks/queries';

/**
 * Progress analytics: weight trend, weekly workout volume, personal records and
 * a quick "log weigh-in" card. Links out to the progress-photo comparison and
 * achievements screens.
 */
export default function ProgressScreen() {
  const units = useSettings((s) => s.units);
  const { data: dash } = useDashboard();
  const { data: weightChart } = useWeightChart();
  const { data: workoutChart } = useWorkoutChart();
  const { data: prs } = usePersonalRecords();
  const { data: current } = useCurrentBodyStat();
  const addStat = useAddBodyStat();

  const [weight, setWeight] = React.useState('');
  const [bodyFat, setBodyFat] = React.useState('');

  const weightSeries: number[] = (weightChart?.series ?? weightChart?.points ?? weightChart ?? [])
    .map((p: any) => (typeof p === 'number' ? p : p.value ?? p.weightKg))
    .filter((v: any) => typeof v === 'number');
  const volumeSeries = (workoutChart?.series ?? dash?.weeklyVolume ?? []).map((p: any) =>
    typeof p === 'number' ? p : p.volume ?? 0
  );

  const prList: any[] = prs?.items ?? prs ?? [];

  function saveWeighIn() {
    if (!weight) return;
    const kg = units === 'imperial' ? Number(weight) / 2.20462 : Number(weight);
    addStat.mutate(
      { weightKg: kg, bodyFatPct: bodyFat ? Number(bodyFat) : undefined },
      { onSuccess: () => { setWeight(''); setBodyFat(''); } }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text variant="h1" style={{ paddingTop: spacing.md }}>
        Progress
      </Text>

      <View style={styles.statRow}>
        <StatCard label="Workouts / wk" value={String(dash?.stats?.workoutsThisWeek ?? 0)} icon="barbell-outline" accent={colors.primary} />
        <StatCard label="Streak" value={`${dash?.stats?.streak ?? 0}🔥`} icon="flame-outline" accent={colors.warning} />
      </View>
      <View style={[styles.statRow, { marginTop: spacing.sm }]}>
        <StatCard label="Calories / wk" value={formatNumber(dash?.stats?.caloriesThisWeek)} icon="fitness-outline" accent={colors.danger} />
        <StatCard label="Personal bests" value={String(dash?.stats?.prCount ?? (Array.isArray(prList) ? prList.length : 0))} icon="trophy-outline" accent={colors.info} />
      </View>

      {/* Weight trend */}
      <SectionHeader title="Body Weight" icon="scale-outline" actionLabel={`Now: ${formatWeight(current?.weightKg, units)}`} />
      <Card>
        {weightSeries.length > 1 ? (
          <TrendChart data={weightSeries} width={320} height={140} color={colors.primary} />
        ) : (
          <Text variant="muted" center style={{ paddingVertical: spacing.xl }}>
            Log two weigh-ins to see your trend.
          </Text>
        )}
      </Card>

      {/* Quick weigh-in */}
      <Card style={{ marginTop: spacing.md }}>
        <Text variant="title">Log a weigh-in</Text>
        <View style={styles.row}>
          <Input
            label={units === 'metric' ? 'Weight (kg)' : 'Weight (lb)'}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            containerStyle={{ flex: 1, marginRight: spacing.sm }}
          />
          <Input
            label="Body fat % (opt.)"
            keyboardType="decimal-pad"
            value={bodyFat}
            onChangeText={setBodyFat}
            containerStyle={{ flex: 1 }}
          />
        </View>
        <Button label="Save" icon="download-outline" loading={addStat.isPending} onPress={saveWeighIn} disabled={!weight} fullWidth />
      </Card>

      {/* Weekly volume */}
      <SectionHeader title="Weekly Volume" icon="bar-chart-outline" />
      <Card>
        {volumeSeries.length ? (
          <BarChart data={volumeSeries.map((v, i) => ({ label: `d${i}`, value: Number(v) }))} color={colors.info} />
        ) : (
          <Text variant="muted" center style={{ paddingVertical: spacing.xl }}>
            No volume recorded yet.
          </Text>
        )}
      </Card>

      {/* PRs */}
      <SectionHeader title="Personal Records" icon="trophy-outline" />
      <Card padded={false}>
        {Array.isArray(prList) && prList.length ? (
          prList.slice(0, 8).map((pr: any, i: number) => (
            <View key={pr.id ?? i} style={styles.prRow}>
              <View style={styles.prIcon}>
                <Ionicons name="trophy" size={16} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ fontSize: 15 }} numberOfLines={1}>
                  {pr.exercise?.name ?? pr.exerciseName ?? 'Exercise'}
                </Text>
                <Text variant="caption">{pr.date ? formatDate(pr.date) : 'Latest'}</Text>
              </View>
              <Badge label={`${pr.value ?? pr.weight ?? '—'}${pr.unit ?? (pr.reps ? `×${pr.reps}` : 'kg')}`} tone="default" />
            </View>
          ))
        ) : (
          <Text variant="muted" center style={{ paddingVertical: spacing.xl }}>
            Hit a PR in your next session to see it here.
          </Text>
        )}
      </Card>

      {/* Photo comparison link */}
      <SectionHeader title="More" icon="grid-outline" />
      <View style={styles.moreGrid}>
        <MoreTile icon="images-outline" label="Photo Progress" onPress={() => router.push('/progress/photos')} />
        <MoreTile icon="ribbon-outline" label="Achievements" onPress={() => router.push('/achievements')} />
        <MoreTile icon="pulse-outline" label="Wearable" onPress={() => router.push('/settings')} />
      </View>
    </ScrollView>
  );
}

function MoreTile({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text variant="caption" style={{ marginTop: 6 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', marginTop: spacing.xs },
  prRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  prIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: `${colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  moreGrid: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
