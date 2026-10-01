import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { ProgressBar } from './ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatMoney, formatRelative } from '@/lib/utils';

// --- ExerciseCard ----------------------------------------------------------
export function ExerciseCard({ exercise, onPress }: { exercise: any; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {(exercise.primaryMuscles ?? []).join(', ') || exercise.category || 'General'}
          </Text>
        </View>
        <Badge label={exercise.difficulty ?? 'Any'} tone="muted" />
      </View>
      <View style={styles.metaRow}>
        <Meta icon="barbell-outline" text={exercise.exerciseType ?? 'Exercise'} />
        {(exercise.equipment ?? []).slice(0, 1).map((e: string) => (
          <Meta key={e} icon="cube-outline" text={e} />
        ))}
        {exercise.ratingAvg ? <Meta icon="star" text={exercise.ratingAvg.toFixed(1)} /> : null}
      </View>
    </Card>
  );
}

// --- WorkoutCard -----------------------------------------------------------
export function WorkoutCard({ workout, onPress }: { workout: any; onPress?: () => void }) {
  const count = (workout.exercises ?? []).length;
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetween}>
        <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
          {workout.name}
        </Text>
        <Badge label={workout.difficulty ?? '—'} tone="default" />
      </View>
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        <Meta icon="list-outline" text={`${count} exercises`} />
        <Meta icon="time-outline" text={`${workout.estimatedDuration ?? '—'} min`} />
        <Meta icon="flame-outline" text={`${workout.estimatedCalories ?? '—'} kcal`} />
      </View>
    </Card>
  );
}

// --- ProgramCard -----------------------------------------------------------
export function ProgramCard({ program, onPress }: { program: any; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={styles.thumb}>
          <Ionicons name="fitness-outline" size={26} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {program.name}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {program.description ?? program.goal}
          </Text>
          <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
            <Meta icon="calendar-outline" text={`${program.durationWeeks} wk`} />
            <Meta icon="barbell-outline" text={`${program.daysPerWeek}/wk`} />
            {program.priceCents ? (
              <Text variant="label" color="primary">{formatMoney(program.priceCents)}</Text>
            ) : (
              <Badge label="Free" tone="success" />
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}

// --- ClassCard -------------------------------------------------------------
export function ClassCard({ cls, onPress }: { cls: any; onPress?: () => void }) {
  const live = cls.status === 'LIVE';
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {cls.title}
          </Text>
          <Text variant="caption">{cls.trainer?.displayName ?? 'Coach'} · {formatRelative(cls.scheduledAt)}</Text>
        </View>
        {live ? <Badge label="Live" tone="danger" icon="radio" /> : <Badge label={cls.classType} tone="muted" />}
      </View>
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        <Meta icon="time-outline" text={`${cls.durationMin} min`} />
        <Meta icon="people-outline" text={`${cls.attendeeCount ?? 0}/${cls.maxParticipants ?? '∞'}`} />
        {cls.priceCents ? <Text variant="label" color="primary">{formatMoney(cls.priceCents)}</Text> : <Badge label="Free" tone="success" />}
      </View>
    </Card>
  );
}

// --- ChallengeCard ---------------------------------------------------------
export function ChallengeCard({ challenge, onPress }: { challenge: any; onPress?: () => void }) {
  const progress = challenge.goalValue ? (challenge.progressValue ?? 0) / challenge.goalValue : 0;
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetween}>
        <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
          {challenge.title}
        </Text>
        <Badge label={challenge.type} tone="info" />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <ProgressBar value={progress} />
        <View style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text variant="caption">
            {challenge.progressValue ?? 0}/{challenge.goalValue} {challenge.goalUnit}
          </Text>
          <Text variant="caption">{challenge.participantCount ?? 0} joined</Text>
        </View>
      </View>
    </Card>
  );
}

// --- TrainerCard -----------------------------------------------------------
export function TrainerCard({ trainer, onPress }: { trainer: any; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar uri={trainer.user?.avatarUrl} name={trainer.user?.displayName} size={52} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text variant="title" numberOfLines={1}>
              {trainer.user?.displayName}
            </Text>
            {trainer.verificationStatus === 'VERIFIED' ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.info} />
            ) : null}
          </View>
          <Text variant="caption" numberOfLines={1}>
            {(trainer.specializations ?? []).join(' · ') || 'Certified coach'}
          </Text>
          <View style={[styles.metaRow, { marginTop: 6 }]}>
            <Meta icon="star" text={trainer.ratingAvg ? trainer.ratingAvg.toFixed(1) : 'New'} />
            <Meta icon="people-outline" text={`${trainer.clientCount ?? 0} clients`} />
            <Text variant="label" color="primary">{formatMoney(trainer.hourlyRateCents)}/hr</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// --- FoodRow ---------------------------------------------------------------
export function FoodRow({ food, onPress }: { food: any; onPress?: () => void }) {
  return (
    <Card onPress={onPress} padded={false} style={{ marginBottom: spacing.sm }}>
      <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1} style={{ fontSize: 15 }}>
            {food.name}
          </Text>
          <Text variant="caption">
            {food.brand ? `${food.brand} · ` : ''}
            {food.servingLabel ?? '1 serving'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="title">{food.calories}</Text>
          <Text variant="caption">kcal</Text>
        </View>
      </View>
    </Card>
  );
}

// --- helpers ---------------------------------------------------------------
function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.faint} />
      <Text variant="caption">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
