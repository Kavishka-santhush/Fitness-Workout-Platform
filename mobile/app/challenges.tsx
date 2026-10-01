import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Badge';
import { ChallengeCard } from '@/components/cards';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { useChallenges } from '@/hooks/queries';

const TYPES = [
  { label: 'All challenges', value: '' },
  { label: 'Streak', value: 'STREAK' },
  { label: 'Volume', value: 'VOLUME' },
  { label: 'Distance', value: 'DISTANCE' },
  { label: 'Steps', value: 'STEPS' },
  { label: 'Calories', value: 'CALORIES' },
];

/** Community + platform challenges: tap one to see the leaderboard. */
export default function ChallengesScreen() {
  const [type, setType] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(true);

  const params = new URLSearchParams({ limit: '50' });
  if (type) params.set('type', type);
  if (activeOnly) params.set('active', 'true');

  const { data, isLoading } = useChallenges(params.toString());
  const items: any[] = data?.items ?? data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Challenges</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Compete on streaks, volume or distance — and drag your friends into it.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
        <Chip label="Running" selected={activeOnly} onPress={() => setActiveOnly((v) => !v)} icon="flame-outline" />
        {TYPES.map((t) => (
          <Chip key={t.value || 'all'} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingRow label="Loading challenges…" />
        ) : items.length ? (
          items.map((c: any) => (
            <ChallengeCard key={c.id} challenge={c} onPress={() => router.push(`/challenges/${c.id}`)} />
          ))
        ) : (
          <EmptyState icon="trophy-outline" title="No challenges here" message="Flip the Running filter to see finished events." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chipContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 4, paddingRight: spacing['2xl'] },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing['3xl'] },
});
