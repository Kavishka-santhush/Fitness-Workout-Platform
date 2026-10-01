import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingRow, StatCard } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatMoney, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useBookSession, useFollowUser, useTrainer, useTrainerAvailability } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

const SESSION_TYPES = [
  { value: 'VIDEO_CALL', label: 'Video call', icon: 'videocam-outline' },
  { value: 'IN_PERSON', label: 'In person', icon: 'person-outline' },
  { value: 'PROGRAM_REVIEW', label: 'Program review', icon: 'documents-outline' },
  { value: 'NUTRITION_COACHING', label: 'Nutrition coaching', icon: 'nutrition-outline' },
] as const;

/** Coach public profile: credentials, pricing, open slots and booking. */
export default function TrainerDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: trainer, isLoading } = useTrainer(userId ?? '');
  const availability = useTrainerAvailability(userId ?? '');
  const book = useBookSession();
  const follow = useFollowUser(userId ?? '');
  const me = useAuthStore((s) => s.user);

  const [picking, setPicking] = React.useState(false);
  const [type, setType] = React.useState<(typeof SESSION_TYPES)[number]['value']>('VIDEO_CALL');
  const [notes, setNotes] = React.useState('');
  const [slot, setSlot] = React.useState<any | null>(null);

  if (isLoading) return <LoadingRow label="Loading coach…" />;
  if (!trainer) return <EmptyState icon="person-outline" title="Coach not found" />;

  const profile = trainer.trainerProfile ?? trainer;
  const account = trainer.user ?? trainer;
  const slots: any[] = (availability.data ?? []).slice(0, 14);
  const reviews: any[] = trainer.reviews ?? [];

  function confirmBooking() {
    if (!slot) return;
    book.mutate(
      {
        trainerUserId: userId,
        availabilityId: slot.id,
        sessionType: type,
        scheduledAt: slot.startTime ?? slot.date,
        durationMin: slot.durationMin ?? 60,
        preSessionNotes: notes || undefined,
      },
      {
        onSuccess: () => {
          haptics.success();
          setPicking(false);
          setSlot(null);
          setNotes('');
        },
      }
    );
  }

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar uri={account.avatarUrl} name={account.displayName} size={72} />
          <View style={{ flex: 1, marginLeft: spacing.lg }}>
            <View style={styles.inlineRow}>
              <Text variant="h2" style={{ flex: 1 }} numberOfLines={1}>
                {account.displayName}
              </Text>
              {profile.verificationStatus === 'VERIFIED' ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.info} />
              ) : null}
            </View>
            <Text variant="caption">@{account.username ?? 'coach'}</Text>
            <Text variant="muted" style={{ marginTop: 4, fontSize: 13 }} numberOfLines={2}>
              {(profile.specializations ?? []).join(' · ') || 'Certified coach'}
            </Text>
          </View>
        </View>

        {profile.bio ? (
          <Text variant="body" style={{ marginTop: spacing.lg, fontSize: 14 }}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={styles.badgeRow}>
          <Badge label={formatMoney(profile.hourlyRateCents)} tone="default" icon="pricetag-outline" />
          <Badge label={`${profile.yearsExperience ?? '—'} yrs experience`} tone="muted" />
          {profile.languages?.length ? <Badge label={profile.languages.slice(0, 3).join(', ')} tone="info" /> : null}
        </View>

        <View style={styles.statRow}>
          <StatCard icon="star" label="Rating" value={profile.ratingAvg ? Number(profile.ratingAvg).toFixed(1) : 'New'} sublabel={`${profile.ratingCount ?? 0} reviews`} />
          <StatCard icon="people-outline" label="Clients" value={String(profile.clientCount ?? 0)} />
          <StatCard icon="barbell-outline" label="Sessions" value={String(profile.sessionsDone ?? 0)} />
        </View>

        {(profile.certifications ?? []).length ? (
          <>
            <SectionHeader title="Credentials" icon="ribbon-outline" />
            <Card>
              {profile.certifications.map((c: any, i: number) => (
                <View key={i} style={styles.row}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                  <Text variant="body" style={{ fontSize: 14, flex: 1, marginLeft: spacing.md, marginBottom: spacing.sm }}>
                    {c.name ?? c}
                    {c.issuer ? <Text variant="caption"> · {c.issuer}</Text> : null}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader
          title="Open Slots"
          icon="calendar-outline"
          subtitle={availability.isLoading ? 'Loading…' : `${slots.filter((s) => !s.booked).length} available`}
          actionLabel="Refresh"
          onAction={() => availability.refetch()}
        />
        {availability.isLoading ? (
          <LoadingRow />
        ) : slots.length ? (
          slots.map((s: any) => (
            <Pressable key={s.id} onPress={() => { if (s.booked) return; setSlot(s); setPicking(true); }}>
              <Card style={{ marginBottom: spacing.sm, opacity: s.booked ? 0.5 : 1, borderColor: slot?.id === s.id ? colors.primary : colors.border }}>
                <View style={styles.slotRow}>
                  <Ionicons name={s.booked ? 'lock-closed-outline' : 'time-outline'} size={18} color={s.booked ? colors.faint : colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text variant="title" style={{ fontSize: 15 }}>
                      {new Date(s.date ?? s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text variant="caption">
                      {formatTime(s.startTime ?? s.date)}
                      {s.endTime ? ` – ${formatTime(s.endTime)}` : ''}
                      {s.sessionTypes?.length ? ` · ${s.sessionTypes.join(', ')}` : ''}
                    </Text>
                  </View>
                  <Badge label={s.booked ? 'Booked' : 'Open'} tone={s.booked ? 'muted' : 'success'} />
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <EmptyState icon="calendar-outline" title="No open slots" message="This coach hasn't published a schedule yet." />
        )}

        {reviews.length ? (
          <>
            <SectionHeader title="Athlete Reviews" icon="chatbubbles-outline" />
            {reviews.slice(0, 5).map((r: any, i: number) => (
              <Card key={r.id ?? i} style={{ marginBottom: spacing.sm }}>
                <View style={styles.inlineRow}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text variant="label">{r.rating ?? '—'}</Text>
                  <Text variant="caption" style={{ marginLeft: 'auto' }}>
                    {r.user?.displayName ?? 'Athlete'}
                  </Text>
                </View>
                <Text variant="body" style={{ fontSize: 14, marginTop: 6 }}>
                  {r.review ?? r.comment}
                </Text>
              </Card>
            ))}
          </>
        ) : null}

      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label="Follow"
          icon="person-add-outline"
          variant="secondary"
          disabled={!me}
          loading={follow.isPending}
          onPress={() => follow.mutate(undefined as any, { onSuccess: () => haptics.light() })}
          style={{ flex: 1 }}
        />
        <Button
          label="Book a session"
          icon="calendar"
          onPress={() => setPicking(true)}
          style={{ flex: 2 }}
        />
      </View>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.scrim} onPress={() => setPicking(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text variant="h3">Book with {account.displayName}</Text>
            <Text variant="caption" style={{ marginTop: 2, marginBottom: spacing.lg }}>
              {slot
                ? `${new Date(slot.date ?? slot.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${formatTime(slot.startTime ?? slot.date)}`
                : 'Pick an open slot above, then choose the session style.'}
            </Text>

            <Text variant="label" style={{ marginBottom: spacing.sm }}>
              Session type
            </Text>
            <View style={styles.typeGrid}>
              {SESSION_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  icon={t.icon as any}
                  selected={type === t.value}
                  onPress={() => setType(t.value)}
                />
              ))}
            </View>

            <Input
              label="Anything the coach should know?"
              placeholder="Goals, injuries, schedule constraints…"
              value={notes}
              onChangeText={setNotes}
              multiline
              containerStyle={{ marginTop: spacing.md }}
            />

            <Button
              label={slot ? 'Confirm booking' : 'Select a slot first'}
              icon="checkmark"
              size="lg"
              fullWidth
              disabled={!slot}
              loading={book.isPending}
              onPress={confirmBooking}
            />
            <Button label="Cancel" variant="ghost" fullWidth onPress={() => setPicking(false)} style={{ marginTop: spacing.xs }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  hero: { flexDirection: 'row', alignItems: 'center' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing['3xl'] },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
