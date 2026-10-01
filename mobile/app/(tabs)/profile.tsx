import React from 'react';
import { Pressable, StyleSheet, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatNumber } from '@/lib/utils';
import { useAuthStore, isPremium } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { healthAvailability } from '@/lib/health';
import { useDashboard } from '@/hooks/queries';

/**
 * Member profile: identity + level progress, subscription status with an
 * upgrade path, and the account menu (settings, notifications, programs,
 * challenges, AI coach, wearable status) plus sign-out.
 */
export default function ProfileScreen() {
  const appUser = useAuthStore((s) => s.user);
  const units = useSettings((s) => s.units);
  const setUnits = useSettings((s) => s.setUnits);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const { data: dash } = useDashboard();

  const level = appUser?.level ?? 1;
  const xp = appUser?.xpPoints ?? 0;
  const xpForNext = level * 500;
  const health = healthAvailability();

  const menu: { icon: keyof typeof Ionicons.glyphMap; label: string; href?: string; onPress?: () => void }[] = [
    { icon: 'settings-outline', label: 'Settings', href: '/settings' },
    { icon: 'notifications-outline', label: 'Notifications', href: '/notifications' },
    { icon: 'ribbon-outline', label: 'Achievements', href: '/achievements' },
    { icon: 'layers-outline', label: 'My Programs', href: '/programs' },
    { icon: 'trophy-outline', label: 'My Challenges', href: '/challenges' },
    { icon: 'sparkles-outline', label: 'AI Coach', href: '/ai-coach' },
    { icon: 'calendar-outline', label: 'Schedule', href: '/schedule' },
  ];

  function confirmSignOut() {
    Alert.alert('Sign out', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut({ redirectUrl: '/' }) },
    ]);
  }

  return (
    <View style={styles.scrollWrap}>
      <View style={styles.inner}>
        {/* Identity card */}
        <Card>
          <View style={styles.identity}>
            <Avatar uri={user?.imageUrl ?? appUser?.avatarUrl} name={appUser?.displayName ?? user?.fullName} size={68} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={styles.rowBetween}>
                <Text variant="h3">{appUser?.displayName ?? user?.fullName ?? 'Athlete'}</Text>
                {isPremium(appUser) ? <Badge label={appUser?.subscriptionType?.replace('_', ' ') ?? 'Premium'} tone="success" /> : <Badge label="Free" tone="muted" />}
              </View>
              <Text variant="caption">@{appUser?.username ?? user?.username ?? 'athlete'}</Text>
              <Text variant="muted" style={{ fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                {user?.primaryEmailAddress?.emailAddress ?? appUser?.bio ?? ''}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Text variant="label">Level {level}</Text>
              <Text variant="caption">{formatNumber(xp)} / {formatNumber(xpForNext)} XP</Text>
            </View>
            <ProgressBar value={xpForNext ? xp / xpForNext : 0} style={{ marginTop: 6 }} />
          </View>

          <View style={styles.miniStats}>
            <MiniStat value={String(appUser?.streakCurrent ?? 0)} label="Day streak" icon="flame" />
            <MiniStat value={String(appUser?.streakLongest ?? 0)} label="Longest" icon="trophy" />
            <MiniStat value={String(dash?.stats?.workoutsThisWeek ?? 0)} label="This week" icon="barbell" />
          </View>
        </Card>

        {/* Upgrade banner */}
        {!isPremium(appUser) ? (
          <Card onPress={() => router.push('/pricing')} elevated style={{ marginTop: spacing.md, borderColor: colors.primary }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text variant="title">Unlock FitForge Premium</Text>
                <Text variant="caption" style={{ marginTop: 2 }}>
                  Unlimited workouts, AI coaching, advanced analytics & more.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </View>
          </Card>
        ) : null}

        {/* Units + wearable quick toggles */}
        <SectionHeader title="Preferences" icon="options-outline" />
        <Card>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="scale-outline" size={18} color={colors.text} />
              <Text variant="body" style={{ marginLeft: spacing.md }}>
                Units
              </Text>
            </View>
            <View style={styles.segGroup}>
              <Pressable onPress={() => setUnits('metric')} style={[styles.seg, units === 'metric' && styles.segActive]}>
                <Text style={{ color: units === 'metric' ? colors.white : colors.muted, fontSize: 12, fontWeight: '700' }}>Metric</Text>
              </Pressable>
              <Pressable onPress={() => setUnits('imperial')} style={[styles.seg, units === 'imperial' && styles.segActive]}>
                <Text style={{ color: units === 'imperial' ? colors.white : colors.muted, fontSize: 12, fontWeight: '700' }}>Imperial</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="pulse-outline" size={18} color={colors.text} />
              <Text variant="body" style={{ marginLeft: spacing.md }}>
                Health source
              </Text>
            </View>
            <Badge label={health.available ? health.provider ?? 'Linked' : 'Not linked'} tone={health.available ? 'success' : 'muted'} />
          </View>
        </Card>

        {/* Menu */}
        <SectionHeader title="Account" icon="person-circle-outline" />
        <Card padded={false}>
          {menu.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => (m.href ? router.push(m.href as any) : m.onPress?.())}
              style={({ pressed }) => [styles.menuRow, i > 0 && styles.menuDivider, pressed && { backgroundColor: colors.elevated }]}
            >
              <Ionicons name={m.icon} size={20} color={colors.primary} />
              <Text variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
                {m.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </Card>

        {isSignedIn ? (
          <Button label="Sign out" icon="log-out-outline" variant="outline" fullWidth style={{ marginTop: spacing.lg, marginBottom: spacing.xl }} onPress={confirmSignOut} />
        ) : null}

        <Text variant="caption" center style={{ marginBottom: spacing.xl }}>
          FitForge · v1.0.0
        </Text>
      </View>
    </View>
  );
}

function MiniStat({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="h3" style={{ marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1, backgroundColor: colors.background },
  inner: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  identity: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniStats: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  miniStat: { flex: 1, alignItems: 'center', backgroundColor: colors.elevated, borderRadius: radius.md, paddingVertical: spacing.md },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  prefLeft: { flexDirection: 'row', alignItems: 'center' },
  segGroup: { flexDirection: 'row', backgroundColor: colors.elevated, borderRadius: radius.full, padding: 3 },
  seg: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  segActive: { backgroundColor: colors.primary },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
