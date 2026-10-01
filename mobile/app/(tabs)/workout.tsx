import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { SearchInput } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Badge';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { ExerciseCard, ProgramCard, WorkoutCard } from '@/components/cards';
import { colors, radius, spacing } from '@/lib/theme';
import { useExercises, useFeaturedPrograms, usePrograms, useWorkouts } from '@/hooks/queries';
import { useSessionStore } from '@/store/session';

type TabKey = 'workouts' | 'programs' | 'exercises';

const DIFFICULTY = ['Any', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const CATEGORIES = ['Any', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

/**
 * Workout hub: switch between saved workouts, training programs and the
 * exercise library. Each surface has search + filter chips and deep-links into
 * the matching detail screen. A floating action starts a quick workout.
 */
export default function WorkoutScreen() {
  const [tab, setTab] = React.useState<TabKey>('workouts');
  const [query, setQuery] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('Any');
  const [category, setCategory] = React.useState('Any');
  const activeSession = useSessionStore((s) => s.active);

  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (tab === 'workouts' && difficulty !== 'Any') params.set('difficulty', difficulty);
  if (tab === 'exercises' && category !== 'Any') params.set('category', category);
  const qs = params.toString();

  const workouts = useWorkouts(qs);
  const programs = usePrograms(qs);
  const featured = useFeaturedPrograms();
  const exercises = useExercises(qs);

  const listData =
    tab === 'workouts' ? workouts.data?.items ?? workouts.data ?? [] :
    tab === 'programs' ? (query ? programs.data?.items ?? programs.data ?? [] : featured.data?.items ?? featured.data ?? []) :
    exercises.data?.items ?? exercises.data ?? [];

  const isLoading =
    tab === 'workouts' ? workouts.isLoading :
    tab === 'programs' ? (query ? programs.isLoading : featured.isLoading) :
    exercises.isLoading;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Train</Text>
        {activeSession ? (
          <Pressable onPress={() => router.push('/session/active')} style={styles.resumePill}>
            <Ionicons name="play" size={14} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Resume</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(['workouts', 'programs', 'exercises'] as TabKey[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabActive]}>
            <Text style={{ color: tab === t ? colors.white : colors.muted, fontWeight: '700' }}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <SearchInput value={query} onChangeText={setQuery} autoCapitalize="none" />

      {tab === 'workouts' ? (
        <View style={styles.chips}>
          {DIFFICULTY.map((d) => (
            <Chip key={d} label={d} selected={difficulty === d} onPress={() => setDifficulty(d)} />
          ))}
        </View>
      ) : null}
      {tab === 'exercises' ? (
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      ) : null}

      {isLoading ? (
        <LoadingRow />
      ) : (
        <FlatList
          data={Array.isArray(listData) ? listData : []}
          keyExtractor={(item: any, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon={tab === 'programs' ? 'layers-outline' : tab === 'exercises' ? 'body-outline' : 'barbell-outline'} title={`No ${tab} found`} message="Try a different search or start a quick workout." />}
          renderItem={({ item }: { item: any }) => {
            if (tab === 'workouts') return <WorkoutCard workout={item} onPress={() => router.push(`/workout/${item.id}`)} />;
            if (tab === 'programs') return <ProgramCard program={item} onPress={() => router.push(`/programs/${item.id}`)} />;
            return <ExerciseCard exercise={item} onPress={() => router.push(`/exercises/${item.id}`)} />;
          }}
        />
      )}

      <Pressable onPress={() => router.push('/session/active')} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}>
        <Ionicons name="flash" size={26} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.sm },
  resumePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.full, padding: 4, marginBottom: spacing.md },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.full },
  tabActive: { backgroundColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  list: { paddingBottom: 120 },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing['2xl'],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
