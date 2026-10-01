import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { IconButton } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/lib/theme';
import { formatRelative } from '@/lib/utils';
import { getSocket, socketEvents } from '@/lib/socket';
import { useMarkAllRead, useNotifications } from '@/hooks/queries';

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  WORKOUT_REMINDER: { icon: 'barbell', color: colors.primary },
  STREAK: { icon: 'flame', color: colors.warning },
  PR: { icon: 'trophy', color: colors.info },
  CHALLENGE: { icon: 'flag', color: colors.fat },
  CLASS: { icon: 'videocam', color: colors.danger },
  SOCIAL: { icon: 'people', color: colors.protein },
  ACHIEVEMENT: { icon: 'ribbon', color: colors.success },
  BILLING: { icon: 'card', color: colors.muted },
  SYSTEM: { icon: 'information-circle', color: colors.muted },
};

/** Realtime notification inbox. Marks all read and reacts to socket pushes. */
export default function NotificationsScreen() {
  const { data, isLoading, refetch } = useNotifications();
  const markAll = useMarkAllRead();
  const items: any[] = data?.items ?? data ?? [];

  // Live updates: refresh when a new notification arrives over the socket.
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(socketEvents.notification, () => refetch());
    return () => socket.off(socketEvents.notification);
  }, [refetch]);

  function mark() {
    markAll.mutate(undefined as any, { onSuccess: () => refetch() });
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text variant="h1">Notifications</Text>
        <IconButton name="checkmark-done-outline" onPress={mark} color={colors.primary} />
      </View>
      {isLoading ? (
        <LoadingRow />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n: any, i) => n.id ?? String(i)}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={undefined}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="All caught up" message="New alerts will show up here." />}
          renderItem={({ item }: { item: any }) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM;
            return (
              <Card style={{ marginBottom: spacing.sm, opacity: item.read ? 0.7 : 1 }} onPress={() => item.actionUrl ? router.push(item.actionUrl as any) : undefined}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text variant="title" style={{ fontSize: 15, flex: 1 }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.read ? <Badge label="New" tone="default" /> : null}
                    </View>
                    <Text variant="muted" style={{ fontSize: 13 }} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text variant="caption" style={{ marginTop: 4 }}>
                      {formatRelative(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  row: { flexDirection: 'row' },
  icon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
});
