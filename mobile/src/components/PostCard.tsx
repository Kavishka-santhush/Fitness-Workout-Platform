import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { colors, spacing } from '@/lib/theme';
import { resolveAssetUrl } from '@/lib/config';
import { formatRelative } from '@/lib/utils';

interface PostCardProps {
  post: any;
  onKudos?: () => void;
  kudosActive?: boolean;
  onComment?: () => void;
}

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  WORKOUT: 'barbell',
  PR: 'trophy',
  ACHIEVEMENT: 'ribbon',
  PHOTO: 'image',
  CARDIO: 'walk',
  CLASS: 'videocam',
  POST: 'chatbubbles',
};

export function PostCard({ post, onKudos, kudosActive, onComment }: PostCardProps) {
  const icon = typeIcon[post.type] ?? 'chatbubbles';
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.header}>
        <Avatar uri={post.user?.avatarUrl} name={post.user?.displayName} size={38} />
        <View style={{ flex: 1 }}>
          <Text variant="title" style={{ fontSize: 15 }}>
            {post.user?.displayName}
          </Text>
          <Text variant="caption">{formatRelative(post.createdAt)}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
      </View>

      {post.content ? (
        <Text variant="body" style={{ marginTop: spacing.md }}>
          {post.content}
        </Text>
      ) : null}

      {post.mediaUrls?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
          {post.mediaUrls.slice(0, 4).map((uri: string) => (
            <Image key={uri} source={{ uri: resolveAssetUrl(uri) }} style={styles.media} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : null}

      {post.session || post.stats?.volume != null || post.stats?.totalVolume != null ? (
        <View style={styles.statRow}>
          <Stat label="Volume" value={`${Math.round(post.stats?.volume ?? post.stats?.totalVolume ?? 0)}kg`} />
          <Stat label="Duration" value={`${Math.round((post.stats?.durationSec ?? post.stats?.duration ?? 0) / 60)}m`} />
          <Stat label="Calories" value={`${post.stats?.calories ?? post.stats?.caloriesBurned ?? 0}`} />
        </View>
      ) : null}

      {post.hashtags?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {post.hashtags.map((h: string) => (
            <Text key={h} variant="caption" color="info" style={{ marginRight: 8 }}>
              #{h}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="thumbs-up" size={15} color={kudosActive ? colors.primary : colors.faint} />
          <Text variant="caption" style={{ marginLeft: 4 }}>
            {post.kudosCount ?? 0}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chatbubble-outline" size={15} color={colors.faint} />
          <Text variant="caption" style={{ marginLeft: 4 }}>
            {post.commentsCount ?? 0}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text variant="label" color="primary" onPress={onKudos}>
          Kudos
        </Text>
        <Text variant="label" color="muted" onPress={onComment} style={{ marginLeft: spacing.md }}>
          Comment
        </Text>
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption">{label}</Text>
      <Text variant="title" style={{ fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.md },
  media: { width: 180, height: 130, borderRadius: 12, marginRight: spacing.sm, backgroundColor: colors.elevated },
  stat: { flex: 1, backgroundColor: colors.elevated, borderRadius: 8, padding: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
});
