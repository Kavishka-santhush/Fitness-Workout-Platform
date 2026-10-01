import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/auth';
import { useFollowUser, useSearchUsers, useSuggestions } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

/** Find athletes and coaches: search the roster or work through suggestions. */
export default function FindFriendsScreen() {
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const me = useAuthStore((s) => s.user);
  const suggestions = useSuggestions();
  const search = useSearchUsers(debounced);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const searching = debounced.length > 1;
  const raw: any[] = searching ? (search.data ?? []) : (suggestions.data?.items ?? suggestions.data ?? []);
  const rows = raw.filter((p: any) => p.id !== me?.id);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Find People</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Follow athletes for their feed posts, coaches for bookings.
        </Text>
        <SearchInput value={q} onChangeText={setQ} placeholder="Name or @username…" autoCapitalize="none" />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title={searching ? 'Search Results' : 'Suggested for You'}
          icon={searching ? 'search-outline' : 'sparkles-outline'}
          subtitle={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`}
        />

        {search.isPending && searching ? (
          <LoadingRow label="Searching…" />
        ) : suggestions.isLoading && !searching ? (
          <LoadingRow />
        ) : rows.length ? (
          rows.map((p: any) => <PersonRow key={p.id} person={p} />)
        ) : (
          <EmptyState
            icon="person-add-outline"
            title={searching ? 'Nobody matched' : 'No suggestions'}
            message={searching ? 'Check the spelling or try a different name.' : 'You already follow everyone we know about.'}
          />
        )}

        {!searching ? (
          <>
            <SectionHeader title="Browse" icon="compass-outline" />
            <Card style={{ marginBottom: spacing.sm }} onPress={() => router.push('/trainers')}>
              <Row icon="person-outline" title="Certified trainers" subtitle="Book 1-on-1 coaching sessions" />
            </Card>
            <Card style={{ marginBottom: spacing.sm }} onPress={() => router.push('/classes')}>
              <Row icon="videocam-outline" title="Live classes" subtitle="Train alongside the community" />
            </Card>
            <Card style={{ marginBottom: spacing.sm }} onPress={() => router.push('/challenges')}>
              <Row icon="trophy-outline" title="Challenges" subtitle="Compete on streaks, volume and distance" />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PersonRow({ person }: { person: any }) {
  const follow = useFollowUser(person.id);
  const [following, setFollowing] = React.useState(false);
  const coach = person.role === 'TRAINER' || person.role === 'NUTRITIONIST';

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.personRow}>
        <Avatar uri={person.avatarUrl} name={person.displayName} size={46} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.inlineRow}>
            <Text variant="title" numberOfLines={1} style={{ fontSize: 15, flex: 1 }}>
              {person.displayName}
            </Text>
            {coach ? <Badge label={person.role === 'NUTRITIONIST' ? 'Nutritionist' : 'Trainer'} tone="info" /> : null}
          </View>
          <Text variant="caption">@{person.username}</Text>
        </View>
        <Button
          label={following ? 'Following' : 'Follow'}
          size="sm"
          variant={following ? 'outline' : 'primary'}
          loading={follow.isPending}
          onPress={() => follow.mutate(undefined as any, { onSuccess: () => { setFollowing(true); haptics.light(); } })}
        />
      </View>
    </Card>
  );
}

function Row({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.browseRow}>
      <View style={styles.browseIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15 }}>
          {title}
        </Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  personRow: { flexDirection: 'row', alignItems: 'center' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  browseRow: { flexDirection: 'row', alignItems: 'center' },
  browseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
});
