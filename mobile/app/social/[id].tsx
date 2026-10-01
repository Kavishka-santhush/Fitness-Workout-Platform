import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { PostCard } from '@/components/PostCard';
import { colors, radius, spacing } from '@/lib/theme';
import { formatRelative } from '@/lib/utils';
import { useAddComment, useGiveKudos, usePostComments, usePostDetail } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

/** Single feed post with its full comment thread and composer. */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading } = usePostDetail(id ?? '');
  const comments = usePostComments(id ?? '');
  const kudos = useGiveKudos(id ?? '');
  const addComment = useAddComment(id ?? '');
  const [draft, setDraft] = React.useState('');

  const list: any[] = (comments.data as any)?.items ?? comments.data ?? [];

  function submit() {
    const content = draft.trim();
    if (!content) return;
    addComment.mutate(
      { content },
      {
        onSuccess: () => {
          setDraft('');
          haptics.light();
        },
      }
    );
  }

  if (isLoading) return <LoadingRow label="Loading post…" />;
  if (!post) {
    return <EmptyState icon="alert-circle-outline" title="Post unavailable" message="It may have been deleted." />;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PostCard post={post} kudosActive={post.kudosGiven} onKudos={() => kudos.mutate()} />

        <SectionHeader title="Comments" icon="chatbubbles-outline" subtitle={`${list.length} ${list.length === 1 ? 'reply' : 'replies'}`} />

        {comments.isLoading ? (
          <LoadingRow />
        ) : list.length ? (
          list.map((c: any) => <CommentRow key={c.id} comment={c} />)
        ) : (
          <EmptyState icon="chatbubble-ellipses-outline" title="No comments yet" message="Say something to get the thread going." />
        )}
      </ScrollView>

      <View style={styles.composer}>
        <Input
          placeholder="Add a comment…"
          value={draft}
          onChangeText={setDraft}
          containerStyle={{ flex: 1, marginBottom: 0 }}
          onSubmitEditing={submit}
          returnKeyType="send"
        />
        <Pressable onPress={submit} style={({ pressed }) => [styles.send, pressed && { opacity: 0.8 }]} disabled={addComment.isPending}>
          <Ionicons name={addComment.isPending ? 'hourglass-outline' : 'navigate'} size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment, depth = 0 }: { comment: any; depth?: number }) {
  const replies: any[] = comment.replies ?? [];
  return (
    <View style={{ marginLeft: depth * spacing.lg }}>
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={styles.head}>
          <Avatar uri={comment.user?.avatarUrl} name={comment.user?.displayName} size={30} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text variant="title" style={{ fontSize: 14 }} numberOfLines={1}>
              {comment.user?.displayName ?? 'Athlete'}
            </Text>
            <Text variant="caption">{formatRelative(comment.createdAt)}</Text>
          </View>
        </View>
        <Text variant="body" style={{ fontSize: 14, marginTop: spacing.sm }}>
          {comment.content}
        </Text>
      </Card>
      {replies.map((r) => (
        <CommentRow key={r.id} comment={r} depth={depth + 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 110 },
  head: { flexDirection: 'row', alignItems: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
