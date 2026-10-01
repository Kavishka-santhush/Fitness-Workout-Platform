import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { TrainerCard } from '@/components/cards';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { useTrainers } from '@/hooks/queries';

const SPECIALIZATIONS = [
  { label: 'Anyone', value: '' },
  { label: 'Strength', value: 'Strength' },
  { label: 'Hypertrophy', value: 'Hypertrophy' },
  { label: 'Fat loss', value: 'Fat Loss' },
  { label: 'Running', value: 'Running' },
  { label: 'Mobility', value: 'Mobility' },
  { label: 'Nutrition', value: 'Nutrition' },
  { label: 'Powerlifting', value: 'Powerlifting' },
];

/** Coach marketplace: browse verified trainers by search term or specialty. */
export default function TrainersScreen() {
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [spec, setSpec] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ limit: '40', sort: 'rating' });
  if (debounced) params.set('q', debounced);
  if (spec) params.set('specialization', spec);

  const { data, isLoading } = useTrainers(params.toString());
  const items: any[] = data?.items ?? data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Find a Trainer</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Verified coaches with per-session booking and in-app messaging.
        </Text>
        <SearchInput value={q} onChangeText={setQ} placeholder="Name, username or keyword…" autoCapitalize="none" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
        {SPECIALIZATIONS.map((s) => (
          <Chip key={s.value || 'any'} label={s.label} selected={spec === s.value} onPress={() => setSpec(s.value)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingRow label="Loading coaches…" />
        ) : items.length ? (
          items.map((t: any) => (
            <TrainerCard
              key={t.id ?? t.userId}
              trainer={t}
              onPress={() => router.push(`/trainers/${t.userId ?? t.id}`)}
            />
          ))
        ) : (
          <EmptyState icon="person-outline" title="No coaches yet" message="Try another specialty or clear the search." />
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
