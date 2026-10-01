import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Badge';
import { ClassCard } from '@/components/cards';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { useLiveClasses } from '@/hooks/queries';

const TYPES = [
  { label: 'All classes', value: '' },
  { label: 'HIIT', value: 'HIIT' },
  { label: 'Strength', value: 'Strength' },
  { label: 'Yoga', value: 'Yoga' },
  { label: 'Spin', value: 'Spin' },
  { label: 'Pilates', value: 'Pilates' },
  { label: 'Boxing', value: 'Boxing' },
  { label: 'Stretching', value: 'Stretching' },
];

/** Live-class schedule: filter by discipline, tap through for details. */
export default function ClassesScreen() {
  const [type, setType] = React.useState('');
  const [upcoming, setUpcoming] = React.useState(true);

  const params = new URLSearchParams({ limit: '40' });
  if (type) params.set('type', type);
  if (upcoming) params.set('upcoming', 'true');

  const { data, isLoading } = useLiveClasses(params.toString());
  const raw: any[] = data?.items ?? data ?? [];
  const items = upcoming ? raw.filter((c) => c.status === 'LIVE' || new Date(c.scheduledAt) >= new Date(Date.now() - 3600_000)) : raw;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Live Classes</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Book a spot, train in real time, then watch the replay.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
        <Chip label="Upcoming" selected={upcoming} onPress={() => setUpcoming((v) => !v)} icon="calendar-outline" />
        {TYPES.map((t) => (
          <Chip key={t.value || 'all'} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <LoadingRow label="Loading classes…" />
        ) : items.length ? (
          items.map((c: any) => <ClassCard key={c.id} cls={c} onPress={() => router.push(`/classes/${c.id}`)} />)
        ) : (
          <EmptyState icon="videocam-outline" title="No classes scheduled" message="Check back soon — coaches publish new rooms weekly." />
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
