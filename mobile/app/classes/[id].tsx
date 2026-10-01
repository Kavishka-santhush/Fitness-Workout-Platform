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
import { formatDate, formatMoney } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useCancelClassEnrollment, useEnrollClass, useLiveClass } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

const TONE_BY_STATUS = { LIVE: 'danger', SCHEDULED: 'info', COMPLETED: 'muted', CANCELLED: 'warning' } as const;

/** Live-class detail: coach, schedule, seats and enrolment / release-seat action. */
export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cls, isLoading } = useLiveClass(id ?? '');
  const enroll = useEnrollClass(id ?? '');
  const leave = useCancelClassEnrollment(id ?? '');
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <LoadingRow label="Loading class…" />;
  if (!cls) return <EmptyState icon="videocam-outline" title="Class not found" />;

  const enrollments: any[] = cls.enrollments ?? [];
  const mine = enrollments.some((e) => (e.userId ?? e.user?.id) === user?.id);
  const seats = cls.maxParticipants ?? 0;
  const taken = cls.attendeeCount ?? enrollments.length ?? 0;
  const live = cls.status === 'LIVE';
  const startsIn = new Date(cls.scheduledAt).getTime() - Date.now();
  const countdown =
    startsIn > 0
      ? startsIn > 86_400_000
        ? formatDate(cls.scheduledAt)
        : `in ${Math.max(0, Math.round(startsIn / 3_600_000))}h`
      : 'now';

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text variant="h1" style={{ flex: 1 }}>
            {cls.title}
          </Text>
          <Badge label={cls.status ?? 'SCHEDULED'} tone={(TONE_BY_STATUS as any)[cls.status] ?? 'muted'} icon={live ? 'radio' : 'time-outline'} />
        </View>

        {cls.description ? (
          <Text variant="muted" style={{ marginTop: spacing.sm }}>
            {cls.description}
          </Text>
        ) : null}

        <View style={styles.badgeRow}>
          <Badge label={cls.classType} tone="default" />
          {cls.priceCents ? <Badge label={formatMoney(cls.priceCents)} tone="info" icon="pricetag" /> : <Badge label="Free" tone="success" />}
          {cls.ratingAvg ? <Badge label={Number(cls.ratingAvg).toFixed(1)} tone="warning" icon="star" /> : null}
        </View>

        {cls.trainer ? (
          <Card style={{ marginTop: spacing.lg }} onPress={() => router.push(`/trainers/${cls.trainer.id}`)}>
            <View style={styles.coachRow}>
              <Avatar uri={cls.trainer.avatarUrl} name={cls.trainer.displayName} size={44} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text variant="title" style={{ fontSize: 15 }}>
                  {cls.trainer.displayName ?? 'Your coach'}
                </Text>
                <Text variant="caption">Tap to view coach profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </View>
          </Card>
        ) : null}

        <View style={styles.statRow}>
          <StatCard icon="time-outline" label="Duration" value={`${cls.durationMin} min`} />
          <StatCard icon="calendar-outline" label="Starts" value={countdown} />
          <StatCard icon="people-outline" label="Seats" value={seats ? `${taken}/${seats}` : String(taken)} />
        </View>

        {seats ? (
          <>
            <Text variant="label" style={{ marginTop: spacing.lg }}>
              Class filling up
            </Text>
            <ProgressBar value={Math.min(1, taken / seats)} style={{ marginTop: spacing.xs }} color={taken / seats > 0.85 ? colors.warning : colors.primary} />
          </>
        ) : null}

        <SectionHeader title="Before you join" icon="information-circle-outline" />
        <Card>
          <Row icon="videocam-outline" text="A private room link lands in your notifications when the coach goes live" />
          <Row icon="walk-outline" text="Bring a mat, water and a small set of weights" />
          <Row icon="time-outline" text={`${formatDate(cls.scheduledAt)} at ${new Date(cls.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — doors open 5 minutes early`} />
          <Row icon="refresh-outline" text={cls.recordingUrl ? 'Replay is already available' : 'Replay is uploaded within 24 hours'} />
        </Card>

        {enrollments.length ? (
          <>
            <SectionHeader title="Attending" icon="people-outline" subtitle={`${taken} athletes`} />
            <View style={styles.attendeeRow}>
              {enrollments.slice(0, 10).map((e: any, i: number) => (
                <Avatar key={e.userId ?? i} uri={e.user?.avatarUrl} name={e.user?.displayName} size={34} />
              ))}
              {taken > 10 ? (
                <View style={styles.moreSeat}>
                  <Text variant="caption">+{taken - 10}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {mine ? (
          <>
            <Button label="Seat reserved" icon="checkmark-circle" variant="secondary" size="lg" style={{ flex: 2 }} onPress={() => haptics.light()} />
            <Button
              label="Release"
              icon="close"
              variant="ghost"
              loading={leave.isPending}
              onPress={() => leave.mutate(undefined, { onSuccess: () => haptics.light() })}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <Button
            label={cls.priceCents ? `Book for ${formatMoney(cls.priceCents)}` : 'Reserve a spot'}
            icon="calendar"
            size="lg"
            fullWidth
            loading={enroll.isPending}
            disabled={!!seats && taken >= seats}
            onPress={() => enroll.mutate(undefined, { onSuccess: () => haptics.success() })}
          />
        )}
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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  coachRow: { flexDirection: 'row', alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  moreSeat: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
