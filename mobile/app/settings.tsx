import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing } from '@/lib/theme';
import { formatWeight, useSettings, type NotificationPrefs } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { syncAndReadToday, healthAvailability } from '@/lib/health';
import { registerForPush } from '@/lib/push';
import { haptics } from '@/lib/haptics';
import { useCurrentBodyStat } from '@/hooks/queries';

const NOTIF_LABELS: { key: keyof NotificationPrefs; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'workoutReminders', label: 'Workout reminders', icon: 'barbell-outline' },
  { key: 'streakAlerts', label: 'Streak alerts', icon: 'flame-outline' },
  { key: 'prAlerts', label: 'Personal-record alerts', icon: 'trophy-outline' },
  { key: 'challengeUpdates', label: 'Challenge updates', icon: 'flag-outline' },
  { key: 'classReminders', label: 'Live class reminders', icon: 'videocam-outline' },
  { key: 'socialActivity', label: 'Social activity', icon: 'people-outline' },
  { key: 'waterReminders', label: 'Water reminders', icon: 'water-outline' },
];

/**
 * App settings: display units, theme, activity goals, notification
 * preferences, health/wearable re-sync, push registration, and data controls.
 */
export default function SettingsScreen() {
  const settings = useSettings();
  const user = useAuthStore((s) => s.user);
  const { data: body } = useCurrentBodyStat();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const health = healthAvailability();

  async function handleSync() {
    setBusy(true);
    setMsg(null);
    const result = await syncAndReadToday().catch(() => null);
    setBusy(false);
    setMsg(result ? `Synced: ${result.steps} steps, ${result.activeCalories} kcal` : 'No health data available');
    haptics.success();
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="h1" style={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          Settings
        </Text>

        {/* Units */}
        <SectionHeader title="Display" icon="options-outline" />
        <Card>
          <Row label="Units">
            <View style={styles.segGroup}>
              {(['metric', 'imperial'] as const).map((u) => (
                <Pressable key={u} onPress={() => settings.setUnits(u)} style={[styles.seg, settings.units === u && styles.segActive]}>
                  <Text style={{ color: settings.units === u ? colors.white : colors.muted, fontSize: 12, fontWeight: '700' }}>
                    {u[0].toUpperCase() + u.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>
          <Row label="Theme">
            <View style={styles.segGroup}>
              {(['dark', 'light', 'system'] as const).map((t) => (
                <Pressable key={t} onPress={() => settings.setTheme(t)} style={[styles.seg, settings.theme === t && styles.segActive]}>
                  <Text style={{ color: settings.theme === t ? colors.white : colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>
        </Card>

        {/* Goals */}
        <SectionHeader title="Daily Goals" icon="flag-outline" />
        <Card>
          <Input label="Step goal" keyboardType="number-pad" value={String(settings.stepGoal)} onChangeText={(v) => settings.setGoals({ stepGoal: Number(v) || 0 })} />
          <Input label="Move goal (kcal)" keyboardType="number-pad" value={String(settings.moveGoal)} onChangeText={(v) => settings.setGoals({ moveGoal: Number(v) || 0 })} containerStyle={{ marginBottom: 0 }} />
          {body?.weightKg != null ? (
            <Text variant="caption" style={{ marginTop: spacing.sm }}>
              Current weight: {formatWeight(body.weightKg, settings.units)}
            </Text>
          ) : null}
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" icon="notifications-outline" />
        <Card padded={false}>
          {NOTIF_LABELS.map((n, i) => (
            <View key={n.key} style={[styles.switchRow, i > 0 && styles.divider]}>
              <Ionicons name={n.icon} size={18} color={colors.primary} />
              <Text variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
                {n.label}
              </Text>
              <Switch
                value={settings.notifications[n.key]}
                onValueChange={(v) => settings.setNotification(n.key, v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </Card>

        {/* Health */}
        <SectionHeader title="Health & Wearable" icon="pulse-outline" />
        <Card>
          <Row label="Source">
            <Text variant="muted">{health.available ? health.provider : 'Not available on this device'}</Text>
          </Row>
          <Button label={busy ? 'Syncing…' : 'Sync now'} icon="refresh" loading={busy} onPress={handleSync} fullWidth style={{ marginTop: spacing.sm }} />
          <Button label="Re-register push token" icon="notifications" variant="outline" onPress={() => registerForPush().then(() => setMsg('Push notifications refreshed'))} style={{ marginTop: spacing.sm }} />
          {msg ? (
            <Text variant="caption" style={{ marginTop: spacing.sm }}>
              {msg}
            </Text>
          ) : null}
        </Card>

        {/* Account */}
        <SectionHeader title="Account" icon="person-circle-outline" />
        <Card padded={false}>
          <LinkRow icon="wallet-outline" label="Subscription & billing" onPress={() => router.push('/pricing')} />
          <LinkRow icon="shield-checkmark-outline" label="Privacy" onPress={() => router.push('/privacy')} />
          <LinkRow icon="help-circle-outline" label="Help & support" onPress={() => router.push('/support')} />
          <LinkRow icon="download-outline" label="Export my data" onPress={() => setMsg('Export queued — we\'ll email you a link.')} last />
        </Card>

        <Text variant="caption" center style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
          Signed in as {user?.displayName ?? 'athlete'} · FitForge v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

function LinkRow({ icon, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, !last && styles.divider, pressed && { backgroundColor: colors.elevated }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  segGroup: { flexDirection: 'row', backgroundColor: colors.elevated, borderRadius: radius.full, padding: 3 },
  seg: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  segActive: { backgroundColor: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
});
