import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { PostCard } from '@/components/PostCard';
import { colors, radius, spacing } from '@/lib/theme';
import { useCreatePost, useFeed, useGiveKudos, useSuggestions } from '@/hooks/queries';

/**
 * Community hub: the friends feed with a composer, kudos actions, friend
 * suggestions, and shortcuts into live classes, challenges and trainer search.
 */
export default function SocialScreen() {
  const feed = useFeed();
  const suggestions = useSuggestions();
  const createPost = useCreatePost();
  const [composing, setComposing] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const posts: any[] = feed.data?.items ?? feed.data ?? [];
  const suggested: any[] = suggestions.data?.items ?? suggestions.data ?? [];

  function publish() {
    if (!draft.trim()) return;
    createPost.mutate({ content: draft.trim(), type: 'POST' }, { onSuccess: () => { setDraft(''); setComposing(false); } });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Community</Text>
        <Pressable onPress={() => setComposing(true)} style={styles.composeBtn}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.shortcuts}>
        <Shortcut icon="videocam-outline" label="Classes" onPress={() => router.push('/classes')} />
        <Shortcut icon="trophy-outline" label="Challenges" onPress={() => router.push('/challenges')} />
        <Shortcut icon="person-outline" label="Trainers" onPress={() => router.push('/trainers')} />
        <Shortcut icon="search-outline" label="Find" onPress={() => router.push('/find-friends')} />
      </View>

      {feed.isLoading ? (
        <LoadingRow label="Loading feed…" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p: any, i) => p.id ?? String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Your feed is quiet" message="Follow friends or post your first workout to get things moving." />}
          renderItem={({ item }: { item: any }) => (
            <KudosPost post={item} />
          )}
          ListHeaderComponent={
            suggested.length ? (
              <Card style={{ marginBottom: spacing.md }}>
                <Text variant="label" style={{ marginBottom: spacing.sm }}>
                  People you may know
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  {suggested.slice(0, 4).map((u: any) => (
                    <View key={u.id} style={{ alignItems: 'center', marginRight: spacing.lg }}>
                      <Avatar uri={u.avatarUrl} name={u.displayName} size={48} />
                      <Text variant="caption" style={{ marginTop: 4 }} numberOfLines={1}>
                        {u.displayName?.split(' ')[0]}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null
          }
        />
      )}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setComposing(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text variant="h3">Share an update</Text>
            <Pressable onPress={() => setComposing(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <TextInput
            multiline
            autoFocus
            placeholder="How did today's session go? #hashtags supported"
            placeholderTextColor={colors.faint}
            style={styles.composer}
            value={draft}
            onChangeText={setDraft}
          />
          <Button label="Post" icon="send" fullWidth loading={createPost.isPending} onPress={publish} disabled={!draft.trim()} />
        </View>
      </Modal>
    </View>
  );
}

function KudosPost({ post }: { post: any }) {
  const kudos = useGiveKudos(post.id);
  return <PostCard post={post} kudosActive={post.kudosGiven} onKudos={() => kudos.mutate()} onComment={() => router.push(`/social/${post.id}`)} />;
}

function Shortcut({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text variant="caption" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.sm },
  composeBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  shortcut: { alignItems: 'center', flex: 1 },
  list: { paddingBottom: spacing['3xl'] },
  backdrop: { flex: 1, backgroundColor: `${colors.black}aa` },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  composer: { backgroundColor: colors.elevated, borderRadius: radius.md, padding: spacing.md, color: colors.text, minHeight: 120, textAlignVertical: 'top', marginBottom: spacing.md },
});
