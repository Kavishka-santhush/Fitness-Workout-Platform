import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { ProgramCard } from '@/components/cards';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { usePrograms } from '@/hooks/queries';

const GOALS = [
  { label: 'All goals', value: '' },
  { label: 'Weight loss', value: 'WEIGHT_LOSS' },
  { label: 'Muscle gain', value: 'MUSCLE_GAIN' },
  { label: 'Endurance', value: 'ENDURANCE' },
  { label: 'Flexibility', value: 'FLEXIBILITY' },
  { label: 'Athletic', value: 'ATHLETIC_PERFORMANCE' },
];

const PRICES = [
  { label: 'Any price', value: '' },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
];

/** Training-program marketplace: search by name, filter by goal and price. */
export default function ProgramsScreen() {
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [price, setPrice] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ limit: '30' });
  if (debounced) params.set('q', debounced);
  if (goal) params.set('goal', goal);
  if (price) params.set('price', price);

  const { data, isLoading } = usePrograms(params.toString());
  const items: any[] = data?.items ?? data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Programs</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Structured multi-week plans from certified coaches.
        </Text>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search programs…" autoCapitalize="none" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
        {GOALS.map((g) => (
          <Chip key={g.value || 'all'} label={g.label} selected={goal === g.value} onPress={() => setGoal(g.value)} />
        ))}
        {PRICES.map((p) => (
          <Chip key={p.value || 'anyp'} label={p.label} selected={price === p.value} onPress={() => setPrice(p.value)} icon={p.value ? 'pricetag-outline' : undefined} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingRow label="Loading programs…" />
        ) : items.length ? (
          items.map((p: any) => (
            <ProgramCard key={p.id} program={p} onPress={() => router.push(`/programs/${p.id}`)} />
          ))
        ) : (
          <EmptyState icon="layers-outline" title="No programs found" message="Try a different goal or clear your search." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chipRow: { flexGrow: 0, marginBottom: spacing.md },
  chipContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingRight: spacing['2xl'] },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
});
