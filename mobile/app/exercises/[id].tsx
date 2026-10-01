import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingRow, EmptyState, Divider } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { resolveAssetUrl } from '@/lib/config';
import { useExercise, useExerciseAlternatives, useRateExercise, useToggleExerciseFavorite } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

/**
 * Exercise library detail: media, muscles, step-by-step instructions, tips,
 * common mistakes and variations, plus favourite / rating / AI alternatives.
 */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ex, isLoading } = useExercise(id ?? '');
  const favorite = useToggleExerciseFavorite(id ?? '');
  const rate = useRateExercise(id ?? '');
  const alternatives = useExerciseAlternatives();
  const [showAlt, setShowAlt] = React.useState(false);

  if (isLoading) return <LoadingRow label="Loading exercise…" />;
  if (!ex) return <EmptyState icon="body-outline" title="Exercise not found" />;

  const instructions: { step?: number; text?: string }[] = Array.isArray(ex.instructions) ? ex.instructions : [];
  const variations = ex.variations ?? {};
  const demo: string[] = ex.demoImages ?? [];
  const altList: any[] = alternatives.data?.alternatives ?? [];

  function rateStars(value: number) {
    rate.mutate({ rating: value, comment: undefined }, { onSuccess: () => haptics.light() });
  }

  function fetchAlternatives() {
    setShowAlt(true);
    if (!alternatives.data) {
      alternatives.mutate({ exerciseId: ex.id, reason: undefined });
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="h1">{ex.name}</Text>
        {ex.description ? (
          <Text variant="muted" style={{ marginTop: 6 }}>
            {ex.description}
          </Text>
        ) : null}

        <View style={styles.badgeRow}>
          <Badge label={ex.difficulty ?? 'Any'} tone="default" icon="speedometer-outline" />
          <Badge label={ex.exerciseType ?? 'STRENGTH'} tone="muted" />
          {ex.category ? <Badge label={ex.category} tone="info" /> : null}
          {ex.metValue ? <Badge label={`${ex.metValue} MET`} tone="warning" /> : null}
        </View>

        {ex.videoUrl ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Button
              label="Watch demo"
              icon="play-circle-outline"
              variant="secondary"
              fullWidth
              onPress={() => void Linking.openURL(ex.videoUrl)}
            />
          </Card>
        ) : demo.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.lg }}>
            {demo.slice(0, 4).map((uri) => (
              <Image key={uri} source={{ uri: resolveAssetUrl(uri) }} style={styles.demo} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.muscleRow}>
          <MuscleGroup title="Primary" items={ex.primaryMuscles ?? []} tone="default" />
          <MuscleGroup title="Secondary" items={ex.secondaryMuscles ?? []} tone="muted" />
        </View>

        {(ex.equipment ?? []).length ? (
          <>
            <SectionHeader title="Equipment" icon="cube-outline" />
            <View style={styles.badgeRow}>
              {ex.equipment.map((e: string) => (
                <Badge key={e} label={e} tone="muted" />
              ))}
            </View>
          </>
        ) : null}

        {instructions.length ? (
          <>
            <SectionHeader title="Instructions" icon="list-outline" />
            <Card>
              {instructions.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text variant="caption" bold>
                      {step.step ?? i + 1}
                    </Text>
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>
                    {step.text ?? String(step)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {(ex.tips ?? []).length ? (
          <>
            <SectionHeader title="Tips" icon="bulb-outline" />
            <Card>
              {ex.tips.map((t: string, i: number) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text variant="body" style={{ flex: 1, marginLeft: spacing.sm, fontSize: 14 }}>
                    {t}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {(ex.commonMistakes ?? []).length ? (
          <>
            <SectionHeader title="Common Mistakes" icon="warning-outline" />
            <Card>
              {ex.commonMistakes.map((t: string, i: number) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text variant="body" style={{ flex: 1, marginLeft: spacing.sm, fontSize: 14 }}>
                    {t}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {variations.beginner?.length || variations.advanced?.length ? (
          <>
            <SectionHeader title="Variations" icon="git-branch-outline" />
            <Card>
              {(['beginner', 'advanced'] as const).map((k) =>
                variations[k]?.length ? (
                  <View key={k} style={{ marginBottom: spacing.md }}>
                    <Text variant="label">{k === 'beginner' ? 'Easier' : 'Harder'}</Text>
                    {variations[k].map((v: string) => (
                      <Text key={v} variant="body" style={{ fontSize: 14, marginTop: 2 }}>
                        · {v}
                      </Text>
                    ))}
                  </View>
                ) : null
              )}
            </Card>
          </>
        ) : null}

        {showAlt ? (
          <Card style={{ borderColor: colors.info }}>
            <Text variant="label" color="info">
              AI alternatives
            </Text>
            {alternatives.isPending ? (
              <LoadingRow label="Thinking…" />
            ) : altList.length ? (
              altList.map((a: any) => (
                <View key={a.exerciseId ?? a.name} style={styles.altRow}>
                  <Text variant="body" style={{ flex: 1, fontSize: 14 }}>
                    {a.name ?? a.exerciseName}
                  </Text>
                  {a.reason ? (
                    <Text variant="caption" style={{ maxWidth: 150 }} numberOfLines={2}>
                      {a.reason}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text variant="caption">No alternatives returned right now.</Text>
            )}
          </Card>
        ) : (
          <Button label="Find alternative exercises" icon="sparkles-outline" variant="outline" fullWidth onPress={fetchAlternatives} style={{ marginTop: spacing.lg }} />
        )}

        <Divider />
        <SectionHeader
          title="Rate this exercise"
          icon="star-outline"
          subtitle={ex.ratingCount ? `${ex.ratingAvg?.toFixed?.(1) ?? ex.ratingAvg} from ${ex.ratingCount} athletes` : 'Be the first to rate'}
        />
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= Math.round(ex.ratingAvg ?? 0) ? 'star' : 'star-outline'}
              size={26}
              color={colors.warning}
              onPress={() => rateStars(n)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={favorite.isPending ? 'Saving…' : ex.favorited ? 'Favorited' : 'Favorite'}
          icon={ex.favorited ? 'heart' : 'heart-outline'}
          variant="secondary"
          onPress={() => favorite.mutate(undefined, { onSuccess: () => haptics.light() })}
          style={{ flex: 1 }}
        />
        <Button
          label="Use in workout"
          icon="add"
          onPress={() => router.replace('/(tabs)/workout')}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function MuscleGroup({ title, items, tone }: { title: string; items: string[]; tone: 'default' | 'muted' }) {
  if (!items.length) return null;
  return (
    <View style={{ flex: 1 }}>
      <Text variant="label" style={{ marginBottom: 6 }}>
        {title}
      </Text>
      <View style={styles.badgeRow}>
        {items.slice(0, 4).map((m) => (
          <Badge key={m} label={m} tone={tone} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  muscleRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  demo: { width: 200, height: 130, borderRadius: radius.md, marginRight: spacing.md, backgroundColor: colors.surface },
  stepRow: { flexDirection: 'row', marginBottom: spacing.md },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3 },
  altRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stars: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
