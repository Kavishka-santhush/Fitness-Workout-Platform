import React from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MacroRing } from '@/components/ui/rings';
import { MacroBar } from '@/components/ui/charts';
import { LoadingRow } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { todayISO } from '@/lib/utils';
import { useLogWater, useMealDay, useTargetToday } from '@/hooks/queries';

const SLOTS = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: 'cafe-outline' as const },
  { key: 'LUNCH', label: 'Lunch', icon: 'restaurant-outline' as const },
  { key: 'DINNER', label: 'Dinner', icon: 'moon-outline' as const },
  { key: 'SNACK', label: 'Snacks', icon: 'fast-food-outline' as const },
];

/**
 * Nutrition diary: today's calorie + macro rings, per-meal breakdown with the
 * entries logged under each, a water tracker, and shortcuts to scan or search
 * foods.
 */
export default function NutritionScreen() {
  const today = todayISO();
  const { data: target, isLoading: targetLoading } = useTargetToday();
  const { data: mealDay, isLoading: mealsLoading } = useMealDay(today);
  const water = useLogWater();

  const totals = target?.totals ?? target ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const goals = target?.goal ?? target ?? { calories: 2200, proteinG: 160, carbsG: 240, fatG: 70 };
  const waterMl = target?.waterMl ?? mealDay?.waterMl ?? 0;
  const waterGoal = target?.waterGoalMl ?? 3000;

  const entriesBySlot: Record<string, any[]> = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    const list = mealDay?.entries ?? mealDay ?? [];
    (Array.isArray(list) ? list : []).forEach((e: any) => {
      const slot = (e.slot ?? 'SNACK').toUpperCase();
      (map[slot] ||= []).push(e);
    });
    return map;
  }, [mealDay]);

  function slotCalories(slot: string): number {
    return (entriesBySlot[slot] ?? []).reduce((sum, e) => sum + (e.calories ?? 0), 0);
  }

  function addWater(amountMl: number) {
    water.mutate({ date: today, amountMl });
  }

  if (targetLoading && mealsLoading) return <LoadingRow label="Loading today's diary…" />;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text variant="h1">Nutrition</Text>
        <Pressable onPress={() => router.push('/nutrition/scan')} style={styles.scanBtn}>
          <Ionicons name="barcode-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      {/* Rings + macros */}
      <Card style={{ marginTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MacroRing used={totals.calories ?? 0} goal={goals.calories ?? 2200} size={128} />
          <View style={{ flex: 1, marginLeft: spacing.lg }}>
            <Text variant="label">Consumed</Text>
            <Text variant="h2">{Math.round(totals.calories ?? 0)}</Text>
            <Text variant="caption">of {Math.round(goals.calories ?? 2200)} kcal goal</Text>
            <View style={{ marginTop: spacing.md }}>
              <MacroBar
                protein={totals.proteinG ?? 0}
                carbs={totals.carbsG ?? 0}
                fat={totals.fatG ?? 0}
                proteinGoal={goals.proteinG ?? 160}
                carbsGoal={goals.carbsG ?? 240}
                fatGoal={goals.fatG ?? 70}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Water tracker */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="water-outline" size={20} color={colors.info} />
            <Text variant="title" style={{ marginLeft: 8 }}>
              Water
            </Text>
          </View>
          <Text variant="caption">
            {Math.round(waterMl / 250)} / {Math.round(waterGoal / 250)} glasses
          </Text>
        </View>
        <View style={styles.waterTrack}>
          <View style={[styles.waterFill, { width: `${Math.min(100, (waterMl / waterGoal) * 100)}%` }]} />
        </View>
        <View style={styles.waterRow}>
          {[250, 500, 750].map((ml) => (
            <Pressable key={ml} onPress={() => addWater(ml)} style={({ pressed }) => [styles.waterChip, pressed && { opacity: 0.8 }]}>
              <Text variant="label" color="info">
                +{ml}ml
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Meals */}
      <SectionHeader title="Today's Meals" icon="restaurant-outline" actionLabel="Add food" onAction={() => router.push('/nutrition/log')} />
      {SLOTS.map((slot) => {
        const items = entriesBySlot[slot.key] ?? [];
        return (
          <Card key={slot.key} style={{ marginBottom: spacing.md }}>
            <Pressable onPress={() => router.push(`/nutrition/log?slot=${slot.key}`)}>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.slotIcon}>
                    <Ionicons name={slot.icon} size={18} color={colors.primary} />
                  </View>
                  <Text variant="title">{slot.label}</Text>
                </View>
                <Badge label={`${slotCalories(slot.key)} kcal`} tone="muted" />
              </View>
            </Pressable>
            {items.length ? (
              <FlatList
                scrollEnabled={false}
                data={items}
                keyExtractor={(e: any, i) => e.id ?? String(i)}
                renderItem={({ item }: { item: any }) => (
                  <View style={styles.foodLine}>
                    <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                      {item.food?.name ?? item.mealName ?? 'Custom item'}
                    </Text>
                    <Text variant="caption">{item.servings ? `${item.servings}× ` : ''}{Math.round(item.calories)} kcal</Text>
                  </View>
                )}
              />
            ) : (
              <Text variant="caption" style={{ marginTop: spacing.sm }}>
                Nothing logged — tap to add.
              </Text>
            )}
          </Card>
        );
      })}

      <Pressable onPress={() => router.push('/nutrition/log')} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text variant="label" color="primary" style={{ marginLeft: 4 }}>
          Log a meal
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  scanBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterTrack: { height: 10, backgroundColor: colors.elevated, borderRadius: radius.full, overflow: 'hidden', marginVertical: spacing.md },
  waterFill: { height: '100%', backgroundColor: colors.info, borderRadius: radius.full },
  waterRow: { flexDirection: 'row', gap: spacing.sm },
  waterChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, backgroundColor: `${colors.info}1f` },
  slotIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  foodLine: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.sm },
});
