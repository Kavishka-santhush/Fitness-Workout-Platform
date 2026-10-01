import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDate, todayISO } from '@/lib/utils';
import { assetUrl, upload } from '@/lib/api';
import { useBeforeAfter, useProgressPhotos } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

const POSES = ['', 'FRONT', 'SIDE', 'BACK', 'RELAXED', 'FLEXED'];
const POSE_LABELS: Record<string, string> = {
  '': 'All poses',
  FRONT: 'Front',
  SIDE: 'Side',
  BACK: 'Back',
  RELAXED: 'Relaxed',
  FLEXED: 'Flexed',
};

/** Progress-photo archive with an automatic before / after comparison. */
export default function ProgressPhotosScreen() {
  const [pose, setPose] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { data, isLoading, refetch } = useProgressPhotos();
  const pairs = useBeforeAfter(pose);

  const groups: any[] = data ?? [];
  const flat: any[] = groups.flatMap((g: any) => g.photos ?? []);
  const pair: any = pairs.data;

  async function addPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos unavailable', 'Allow photo access to log progress pictures.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets?.length) return;

    const asset = picked.assets[0];
    setBusy(true);
    try {
      await upload(
        '/progress/photos',
        { date: todayISO(), pose: pose || undefined },
        {
          uri: asset.uri,
          name: `progress-${Date.now()}.jpg`,
          type: 'image/jpeg',
        }
      );
      haptics.success();
      refetch();
      pairs.refetch();
    } catch {
      Alert.alert('Upload failed', 'The photo could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="h1">Progress Photos</Text>
        <Text variant="muted" style={{ marginBottom: spacing.md }}>
          Same lighting, same pose — the camera never lies.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
          {POSES.map((p) => (
            <Chip key={p || 'all'} label={POSE_LABELS[p]} selected={pose === p} onPress={() => setPose(p)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {pair ? (
          <Card style={{ marginBottom: spacing.lg, borderColor: colors.primary }}>
            <Text variant="label" color="primary">
              Before / After
            </Text>
            <View style={styles.compareRow}>
              {[pair.before, pair.after].map((p: any, i: number) => (
                <View key={p?.id ?? i} style={{ flex: 1 }}>
                  <Image source={{ uri: assetUrl(p?.imageUrl) }} style={styles.compareImage} resizeMode="cover" />
                  <Text variant="caption" center style={{ marginTop: 6 }}>
                    {i === 0 ? 'Start' : 'Latest'} · {formatDate(p?.date)}
                  </Text>
                  {p?.weightKg ? (
                    <Text variant="caption" center>
                      {Number(p.weightKg)} kg
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            <View style={styles.deltaRow}>
              {pair.daysElapsed != null ? <Badge label={`${pair.daysElapsed} days`} tone="muted" icon="time-outline" /> : null}
              {pair.weightDelta != null ? (
                <Badge
                  label={`${pair.weightDelta > 0 ? '+' : ''}${pair.weightDelta} kg`}
                  tone={pair.weightDelta > 0 ? 'warning' : 'success'}
                  icon="scale-outline"
                />
              ) : null}
              {pair.bodyFatDelta != null ? (
                <Badge
                  label={`${pair.bodyFatDelta > 0 ? '+' : ''}${pair.bodyFatDelta}% body fat`}
                  tone={pair.bodyFatDelta > 0 ? 'warning' : 'success'}
                  icon="pulse-outline"
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        <SectionHeader
          title="Timeline"
          icon="images-outline"
          subtitle={`${flat.length} photos`}
          actionLabel="Add"
          onAction={addPhoto}
        />

        {isLoading ? (
          <LoadingRow />
        ) : flat.length === 0 ? (
          <EmptyState
            icon="camera-outline"
            title="No photos yet"
            message="Take a front shot today and compare it in four weeks."
          />
        ) : (
          groups.map((g: any) => (
            <View key={g.month} style={{ marginBottom: spacing.md }}>
              <Text variant="label" style={{ marginBottom: spacing.sm }}>
                {new Date(`${g.month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.grid}>
                {(g.photos ?? []).map((p: any) => (
                  <Pressable key={p.id} onPress={() => showPhotoDetails(p)}>
                    <Image source={{ uri: assetUrl(p.imageUrl) }} style={styles.thumb} resizeMode="cover" />
                    {p.pose ? (
                      <View style={styles.poseTag}>
                        <Text variant="caption" style={{ color: colors.white }}>
                          {p.pose.slice(0, 3)}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}

        <Button label="Add progress photo" icon="camera" variant="secondary" fullWidth loading={busy} onPress={addPhoto} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </View>
  );
}

function showPhotoDetails(photo: any) {
  const lines = [
    formatDate(photo.date),
    photo.pose ? `Pose: ${photo.pose}` : null,
    photo.weightKg ? `${Number(photo.weightKg)} kg` : null,
    photo.bodyFatPct ? `${Number(photo.bodyFatPct)}% body fat` : null,
    photo.notes,
  ].filter(Boolean);
  Alert.alert('Progress photo', lines.join('\n'));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chipContent: { gap: spacing.sm, paddingVertical: 4, paddingRight: spacing.lg },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  compareRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  compareImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.elevated },
  deltaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: '31%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.elevated },
  poseTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
});
