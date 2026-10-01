import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { api } from '@/lib/api';

const SECTIONS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'person-lock-outline',
    title: 'What we store',
    body: 'Your name, email, measurements, workout logs, nutrition diary, photos and device data. Authentication credentials are handled by Clerk — we never see or store your password.',
  },
  {
    icon: 'server-outline',
    title: 'Where it lives',
    body: 'Workout content and progress photos are written to our own object storage on our server. Database records are held in Postgres with row-level ownership checks on every query.',
  },
  {
    icon: 'share-social-outline',
    title: 'Third parties we use',
    body: 'Stripe for payments, OpenRouter for AI coaching, Apple HealthKit / Google Health Connect for wearable sync (read locally first, only daily totals are uploaded), and your OS push service for notifications.',
  },
  {
    icon: 'eye-off-outline',
    title: 'Who can see your data',
    body: 'Profile visibility, feed posts and challenges are controlled by the privacy settings on your profile. A PRIVATE profile is excluded from search. You can block any athlete at any time.',
  },
  {
    icon: 'download-outline',
    title: 'Your rights',
    body: 'Export everything, correct anything, or ask us to delete your account and associated records. Exports are generated on demand and delivered as a download link.',
  },
];

/** Privacy policy plus a one-tap export of the athlete's own dataset. */
export default function PrivacyScreen() {
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function exportAll() {
    setExporting(true);
    setError(null);
    try {
      const res = await api.get('/progress/export/all');
      const payload: any = res?.data?.data ?? res?.data ?? {};
      const url = payload.url ?? payload.downloadUrl ?? payload.file;
      if (url) {
        await Linking.openURL(/^https?:/i.test(url) ? url : `${api.defaults.baseURL}${url}`);
      } else {
        setError('Your export is ready — open it from the web app downloads page.');
      }
    } catch {
      setError('Export failed. Please try again in a moment.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text variant="h1">Privacy</Text>
      <Text variant="caption" style={{ marginTop: 4 }}>
        Last updated · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </Text>
      <Text variant="muted" style={{ marginTop: spacing.md, fontSize: 14 }}>
        FitForge is a training diary, not an ad network. This page summarises what we collect and the controls you hold.
      </Text>

      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ marginTop: spacing.md }}>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name={s.icon} size={18} color={colors.primary} />
            </View>
            <Text variant="title" style={{ fontSize: 15, flex: 1 }}>
              {s.title}
            </Text>
          </View>
          <Text variant="body" style={{ fontSize: 14, marginTop: spacing.md }}>
            {s.body}
          </Text>
        </Card>
      ))}

      <SectionHeader title="Take action" icon="shield-checkmark-outline" />
      <Button label="Export my data" icon="download-outline" loading={exporting} onPress={exportAll} />
      <Button label="Manage profile visibility" icon="eye-outline" variant="secondary" onPress={() => router.push('/settings')} style={{ marginTop: spacing.sm }} />
      <Button label="Contact support" icon="mail-outline" variant="outline" onPress={() => router.push('/support')} style={{ marginTop: spacing.sm }} />

      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: spacing.md }}>
          {error}
        </Text>
      ) : null}

      <Divider />
      <Text variant="caption" center>
        Account deletion is handled by our team within 30 days of a verified request.
      </Text>
      <Text variant="caption" center style={{ marginTop: 4 }}>
        Full legal text is available at fitforge.app/privacy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  head: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
});
