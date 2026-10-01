import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingRow, ProgressBar } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useChallenge, useChallengeLeaderboard, useEnrollChallenge } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Challenge detail: goal, dates, milestones and the live leaderboard. */
export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: challenge, isLoading } = useChallenge(id ?? '');
  const board = useChallengeLeaderboard(id ?? '');
  const enroll = useEnrollChallenge(id ?? '');
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <LoadingRow label="Loading challenge…" />;
  if (!challenge) return <EmptyState icon="trophy-outline" title="Challenge not found" />;

  const goal = Number(challenge.goalValue ?? 0);
  const mine = Number(challenge.myProgress ?? 0);
  const pct = goal ? Math.min(1, mine / goal) : 0;
  const joined = !!challenge.isJoined;
  const rows: any[] = board.data ?? [];
  const milestones: { at?: number; label?: string }[] = Array.isArray(challenge.milestones) ? challenge.milestones : [];
  const endsIn = new Date(challenge.endDate).getTime() - Date.now();
  const ended = endsIn < 0;
  const rules = challenge.rulesConfig ?? {};
  const entries: any[] = challenge.entries ?? [];
  const myEntry = entries.find((e) => e.userId === user?.id);
  const myRank = challenge.myRank ?? myEntry?.rank ?? null;

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text variant="h1" style={{ flex: 1 }}>
            {challenge.title}
          </Text>
          <Badge label={challenge.type} tone="info" />
        </View>
        {challenge.description ? (
          <Text variant="muted" style={{ marginTop: spacing.sm }}>
            {challenge.description}
          </Text>
        ) : null}

        <Card style={{ marginTop: spacing.lg, borderColor: colors.primary }}>
          <View style={styles.inlineRow}>
            <Text variant="h2">{goal ? `${mine.toLocaleString()}` : '—'}</Text>
            <Text variant="muted"> / {goal.toLocaleString()} {challenge.goalUnit}</Text>
          </View>
          <ProgressBar value={pct} style={{ marginTop: spacing.sm }} />
          <View style={[styles.inlineRow, { marginTop: spacing.sm }]}>
            <Badge label={`${Math.round(pct * 100)}% complete`} tone={pct >= 1 ? 'success' : 'muted'} />
            {myRank ? <Badge label={`Rank #${myRank}`} tone="warning" icon="trophy" /> : null}
          </View>
        </Card>

        <View style={styles.badgeRow}>
          <Badge label={`${challenge.participantCount ?? 0} athletes`} tone="muted" icon="people-outline" />
          <Badge label={ended ? 'Finished' : `${Math.max(1, Math.ceil(endsIn / 86_400_000))} days left`} tone={ended ? 'muted' : 'danger'} icon="time-outline" />
          {challenge.isTeamBased ? <Badge label="Team based" tone="info" icon="people-circle-outline" /> : null}
          {challenge.scope !== 'PLATFORM' ? <Badge label={challenge.scope} tone="default" /> : null}
        </View>

        <SectionHeader title="Window" icon="calendar-outline" />
        <Card>
          <Row icon="play-outline" text={`Starts ${formatDate(challenge.startDate)}`} />
          <Row icon="flag-outline" text={`Ends ${formatDate(challenge.endDate)}`} />
          {challenge.prize ? <Row icon="gift-outline" text={challenge.prize} /> : null}
          {rules.metric ? <Row icon="analytics-outline" text={`Tracked by ${rules.metric}${rules.exerciseFilter ? ` (${rules.exerciseFilter})` : ''}`} /> : null}
        </Card>

        {milestones.length ? (
          <>
            <SectionHeader title="Milestones" icon="flag-outline" />
            {milestones.map((m, i) => {
              const reached = pct >= (m.at ?? 0);
              return (
                <View key={i} style={styles.milestone}>
                  <Ionicons name={reached ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={reached ? colors.primary : colors.faint} />
                  <Text variant="body" style={{ flex: 1, marginLeft: spacing.md, fontSize: 14 }}>
                    {m.label ?? `${Math.round((m.at ?? 0) * 100)}%`}
                  </Text>
                  <Text variant="caption">{Math.round((m.at ?? 0) * 100)}%</Text>
                </View>
              );
            })}
          </>
        ) : null}

        <SectionHeader title="Leaderboard" icon="trophy-outline" subtitle={`${rows.length} ranked`} />
        {board.isLoading ? (
          <LoadingRow />
        ) : rows.length ? (
          rows.slice(0, 25).map((r: any, i: number) => (
            <View key={r.userId ?? i} style={[styles.boardRow, r.userId === user?.id && styles.boardMine]}>
              <Text variant="label" style={{ width: 30 }}>
                {MEDALS[r.rank - 1] ?? r.rank ?? i + 1}
              </Text>
              <Avatar uri={r.avatarUrl} name={r.name} size={32} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text variant="title" numberOfLines={1} style={{ fontSize: 14 }}>
                  {r.userId === user?.id ? 'You' : r.name ?? 'Athlete'}
                </Text>
                <ProgressBar
                  value={goal ? Math.min(1, Number(r.progress ?? 0) / goal) : 0}
                  height={4}
                  style={{ marginTop: 4 }}
                  color={r.completed ? colors.success : colors.primary}
                />
              </View>
              <Text variant="caption" style={{ marginLeft: spacing.md }}>
                {Number(r.progress ?? 0).toLocaleString()} {challenge.goalUnit}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState icon="people-outline" title="No entries yet" message="Join and take the first spot." />
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={joined ? 'You’re in — keep pushing' : ended ? 'Challenge closed' : 'Join challenge'}
          icon={joined ? 'checkmark-circle' : 'trophy-outline'}
          size="lg"
          fullWidth
          variant={joined ? 'secondary' : 'primary'}
          disabled={joined || ended}
          loading={enroll.isPending}
          onPress={() => enroll.mutate(undefined, { onSuccess: () => haptics.success() })}
        />
      </View>
    </View>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text variant="body" style={{ fontSize: 14, flex: 1, marginLeft: spacing.md, marginBottom: spacing.sm }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  milestone: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  boardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  boardMine: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
