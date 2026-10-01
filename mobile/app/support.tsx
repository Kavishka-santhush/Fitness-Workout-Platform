import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/auth';

const SUPPORT_EMAIL = 'support@fitforge.app';

const TOPICS = ['Billing', 'Technical', 'Account', 'Content', 'Feedback'];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I cancel my subscription?',
    a: 'Open Subscription & billing below. Your plan is managed by Stripe, so you can switch tiers or cancel at any time — you keep Premium features until the end of the current billing period.',
  },
  {
    q: 'My wearable sync stopped working',
    a: 'Re-link the source from Profile › Preferences › Health source. If totals still look off, pull to refresh on the Progress tab — daily totals are recalculated from the device each morning.',
  },
  {
    q: 'The AI food estimate looks wrong',
    a: 'Estimates are a starting point. Log the item, then edit the portion or search the verified database from the food log. Barcodes return exact packaged-food values.',
  },
  {
    q: 'How do I make my profile private?',
    a: 'In Settings you control feed visibility, whether other athletes can find you in search, and who can message you. A PRIVATE profile is hidden from search and the social feed.',
  },
  {
    q: 'Can I export my training data?',
    a: 'Yes. The Privacy page has a one-tap export that generates a download link for your workouts, nutrition diary, measurements and progress photos.',
  },
];

/** Help centre: a tappable FAQ, direct contact channels, and account deep-links. */
export default function SupportScreen() {
  const user = useAuthStore((s) => s.user);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [topic, setTopic] = React.useState('Technical');
  const [message, setMessage] = React.useState('');

  function mailtoUrl() {
    const subject = encodeURIComponent(`[FitForge ${topic}] Support request`);
    const body = encodeURIComponent(
      `${message.trim()}\n\n—\nAthlete: ${user?.displayName ?? user?.username ?? 'guest'}\nApp: FitForge Mobile`
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      // ignore — device without a mail handler
    }
  }

  const canSend = message.trim().length > 4;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text variant="h1">Help &amp; Support</Text>
      <Text variant="muted" style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Answers to common questions, plus a direct line to a human.
      </Text>

      <SectionHeader title="Popular Questions" icon="help-buoy-outline" />
      {FAQS.map((f, i) => {
        const open = openFaq === i;
        return (
          <Card key={f.q} style={{ marginBottom: spacing.sm }} padded={false}>
            <Pressable onPress={() => setOpenFaq(open ? null : i)} style={styles.faqHead}>
              <Text variant="title" style={{ fontSize: 15, flex: 1 }}>
                {f.q}
              </Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
            </Pressable>
            {open ? (
              <View style={styles.faqBody}>
                <Text variant="body" style={{ fontSize: 14 }}>
                  {f.a}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionHeader title="Message Us" icon="chatbox-ellipses-outline" subtitle="We reply within one business day" />
      <Card>
        <Text variant="label">Topic</Text>
        <View style={styles.topicRow}>
          {TOPICS.map((t) => (
            <Chip key={t} label={t} selected={topic === t} onPress={() => setTopic(t)} />
          ))}
        </View>
        <Input
          label="Describe the issue"
          placeholder="What happened, and what did you expect?"
          value={message}
          onChangeText={setMessage}
          multiline
          containerStyle={{ marginTop: spacing.md }}
        />
        <Button
          label="Send via email"
          icon="mail-outline"
          fullWidth
          disabled={!canSend}
          onPress={() => openUrl(mailtoUrl())}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <SectionHeader title="Other Channels" icon="compass-outline" />
      <Card padded={false}>
        <ContactRow icon="logo-discord" label="Community Discord" hint="Chat with other athletes" onPress={() => openUrl('https://discord.gg/fitforge')} />
        <View style={styles.rowDivider} />
        <ContactRow icon="server-outline" label="System status" hint="Live incident & uptime board" onPress={() => openUrl('https://status.fitforge.app')} />
        <View style={styles.rowDivider} />
        <ContactRow icon="mail-outline" label="Email support" hint={SUPPORT_EMAIL} onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)} />
      </Card>

      <SectionHeader title="Quick Links" icon="link-outline" />
      <Button label="Subscription & billing" icon="wallet-outline" variant="secondary" onPress={() => router.push('/pricing')} />
      <Button label="Privacy & data export" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/privacy')} style={{ marginTop: spacing.sm }} />
      <Button label="Account settings" icon="settings-outline" variant="outline" onPress={() => router.push('/settings')} style={{ marginTop: spacing.sm }} />

      <Divider />
      <View style={styles.footer}>
        <Badge label="FitForge Mobile" tone="muted" icon="phone-portrait-outline" />
        <Text variant="caption" center style={{ marginTop: spacing.sm }}>
          Response times are Monday–Friday. For urgent billing issues, include your Stripe receipt ID.
        </Text>
      </View>
    </ScrollView>
  );
}

function ContactRow({ icon, label, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.contactRow, pressed && { backgroundColor: colors.elevated }]}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15 }}>
          {label}
        </Text>
        <Text variant="caption">{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  faqHead: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  faqBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  contactIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: { alignItems: 'center', marginTop: spacing.md },
});
