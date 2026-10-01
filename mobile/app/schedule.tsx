import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatTime } from '@/lib/utils';
import { useScheduleToday, useScheduleWeek } from '@/hooks/queries';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Week planner: a horizontal day strip plus today's scheduled items. */
export default function ScheduleScreen() {
  const today = useScheduleToday();
  const week = useScheduleWeek();
  const items: any[] = today.data?.items ?? today.data ?? [];
  const weekDays: any[] = week.data?.days ?? week.data ?? [];

  const now = new Date();
  const strip = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return d;
  });

  return (
    <Screen>
      <Text variant="h1">Schedule</Text>

      <View style={styles.strip}>
        {strip.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString();
          return (
            <View key={i} style={[styles.dayCell, isToday && styles.dayToday]}>
              <Text variant="caption">{DAY_NAMES[d.getDay()][0]}</Text>
              <Text variant="title" style={{ fontSize: 16, marginTop: 2, color: isToday ? colors.white : colors.text }}>
                {d.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionHeader title="Today" icon="today-outline" />
      {today.isLoading ? (
        <LoadingRow />
      ) : items.length ? (
        items.map((it: any, i: number) => (
          <Card key={it.id ?? i} style={{ marginBottom: spacing.sm }} onPress={() => it.workoutId ? router.push(`/workout/${it.workoutId}`) : it.classId ? router.push(`/classes/${it.classId}`) : undefined}>
            <View style={styles.itemRow}>
              <View style={styles.itemIcon}>
                <Ionicons name={it.type === 'CLASS' ? 'videocam' : it.type === 'CARDIO' ? 'walk' : 'barbell'} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" numberOfLines={1}>
                  {it.title ?? it.name ?? it.type}
                </Text>
                <Text variant="caption">{it.scheduledAt ? formatTime(it.scheduledAt) : it.time ?? 'Flexible'} {it.location ? `· ${it.location}` : ''}</Text>
              </View>
              <Badge label={it.type ?? 'Session'} tone="muted" />
            </View>
          </Card>
        ))
      ) : (
        <EmptyState icon="calendar-outline" title="Nothing scheduled" message="Enjoy your rest day or plan ahead." />
      )}

      {Array.isArray(weekDays) && weekDays.length ? (
        <>
          <SectionHeader title="This Week" icon="calendar-number-outline" />
          {weekDays.map((d: any, i: number) => {
            const count = (d.items ?? d.sessions ?? []).length;
            return (
              <View key={i} style={styles.weekRow}>
                <Text variant="body" style={{ flex: 1 }}>
                  {d.label ?? d.date ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : `Day ${i + 1}`}
                </Text>
                <Text variant="caption">{count ? `${count} planned` : 'Rest'}</Text>
              </View>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.lg },
  dayCell: { alignItems: 'center', width: '12.5%', paddingVertical: spacing.sm, borderRadius: radius.md },
  dayToday: { backgroundColor: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
