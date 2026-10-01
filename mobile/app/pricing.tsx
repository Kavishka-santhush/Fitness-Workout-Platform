import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingRow, EmptyState } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { formatMoney } from '@/lib/utils';
import { useAuthStore, isPremium } from '@/store/auth';
import { usePlans, useSubscribe } from '@/hooks/queries';

/**
 * Subscription plans pulled from `GET /api/payments/plans`. Choosing a plan
 * starts a Stripe checkout via `POST /api/payments/subscribe` and opens the
 * returned checkout URL in the browser.
 */
export default function PricingScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = usePlans();
  const subscribe = useSubscribe();
  const [selected, setSelected] = React.useState<string | null>(null);

  const plans: any[] = data?.items ?? data ?? [];

  function choose(plan: any) {
    setSelected(plan.code ?? plan.id);
    subscribe.mutate(
      { planCode: plan.code ?? plan.id, successUrl: 'fitforge://pricing/success' },
      {
        onSuccess: (res: any) => {
          const url = res?.checkoutUrl ?? res?.url ?? res?.sessionUrl;
          if (url) void Linking.openURL(url);
        },
      }
    );
  }

  return (
    <Screen>
      <Text variant="h1">Plans</Text>
      <Text variant="muted" style={{ marginTop: 4, marginBottom: spacing.lg }}>
        {isPremium(user) ? `You're on ${user?.subscriptionType}. Upgrade anytime.` : 'Pick a plan to unlock more of FitForge.'}
      </Text>

      {isLoading ? (
        <LoadingRow />
      ) : plans.length === 0 ? (
        <EmptyState icon="card-outline" title="No plans available" message="Billing isn't configured yet." />
      ) : (
        plans.map((plan: any) => {
          const popular = plan.featured || plan.code === 'PREMIUM';
          const active = selected === (plan.code ?? plan.id) && subscribe.isPending;
          return (
            <Card key={plan.id ?? plan.code} style={{ marginBottom: spacing.md, borderColor: popular ? colors.primary : colors.border }}>
              {popular ? (
                <View style={styles.popularTag}>
                  <Badge label="Most popular" tone="default" />
                </View>
              ) : null}
              <View style={styles.priceRow}>
                <Text variant="h3">{plan.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="h2">{plan.priceCents ? formatMoney(plan.priceCents) : 'Free'}</Text>
                  <Text variant="caption">{plan.interval === 'year' ? '/year' : plan.interval === 'month' ? '/month' : ''}</Text>
                </View>
              </View>
              {(plan.benefits ?? plan.features ?? []).slice(0, 6).map((b: string) => (
                <View key={b} style={styles.benefit}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text variant="body" style={{ fontSize: 14, marginLeft: 8, flex: 1 }}>
                    {b}
                  </Text>
                </View>
              ))}
              <Button
                label={plan.priceCents ? 'Subscribe' : 'Current plan'}
                icon="sparkles"
                variant={popular ? 'primary' : 'secondary'}
                fullWidth
                loading={active}
                disabled={plan.priceCents === 0}
                onPress={() => choose(plan)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          );
        })
      )}

      <Text variant="caption" center style={{ marginTop: spacing.lg }}>
        Secure checkout powered by Stripe. Cancel anytime.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  popularTag: { position: 'absolute', top: -10, right: spacing.lg },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  benefit: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
});
