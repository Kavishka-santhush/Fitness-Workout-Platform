import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingRow, ProgressBar } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDate } from '@/lib/utils';
import { useAchievements } from '@/hooks/queries';

/** Trophy case: every achievement with unlock state and progress. */
export default function AchievementsScreen() {
  const { data, isLoading } = useAchievements();
  const items: any[] = data?.items ?? data ?? [];
  const unlocked = items.filter((a) => a.unlocked || a.earnedAt);

  if (isLoading) return <LoadingRow label="Loading trophies…" />;

  return (
    <Screen>
      <Text variant="h1">Achievements</Text>
      <Text variant="muted" style={{ marginTop: 4, marginBottom: spacing.lg }}>
        {unlocked.length} of {items.length} unlocked
      </Text>

      {items.length === 0 ? (
        <EmptyState icon="ribbon-outline" title="No achievements yet" message="Train, log meals and join challenges to earn trophies." />
      ) : (
        <View style={styles.grid}>
          {items.map((a: any) => {
            const done = a.unlocked || a.earnedAt;
            const pct = a.progress != null && a.goal ? Math.min(1, a.progress / a.goal) : done ? 1 : 0;
            return (
              <Card key={a.id ?? a.code} style={{ marginBottom: spacing.md, opacity: done ? 1 : 0.75 }}>
                <View style={styles.head}>
                  <View style={[styles.medal, { backgroundColor: done ? `${colors.warning}22` : colors.elevated }]}>
                    <Ionicons name={done ? 'trophy' : 'lock-closed'} size={22} color={done ? colors.warning : colors.faint} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text variant="title" style={{ fontSize: 15 }}>
                      {a.name ?? a.title}
                    </Text>
                    <Text variant="caption" numberOfLines={2}>
                      {a.description}
                    </Text>
                  </View>
                  {done ? <Badge label="Earned" tone="success" /> : <Badge label={`${Math.round(pct * 100)}%`} tone="muted" />}
                </View>
                {!done && pct > 0 ? <ProgressBar value={pct} style={{ marginTop: spacing.md }} /> : null}
                {a.earnedAt ? (
                  <Text variant="caption" style={{ marginTop: 6 }}>
                    Unlocked {formatDate(a.earnedAt)}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  medal: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
