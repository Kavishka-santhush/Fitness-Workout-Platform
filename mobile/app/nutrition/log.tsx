import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { Input, SearchInput } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FoodRow } from '@/components/cards';
import { EmptyState, LoadingRow } from '@/components/ui/Feedback';
import { colors, spacing } from '@/lib/theme';
import { todayISO } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useCreateCustomFood, useFoods, useLogMealEntry, useRecentFoods } from '@/hooks/queries';

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

/**
 * Food diary search + logger. Query the food database, tap a result to log one
 * serving into the chosen meal slot, add a custom food, or fire up the AI
 * calorie estimator from a photo.
 */
export default function LogFoodScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const [slot, setSlot] = React.useState((params.slot ?? 'LUNCH').toUpperCase());
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [custom, setCustom] = React.useState<{ name: string; calories: string } | null>(null);

  const foods = useFoods(debounced ? `q=${encodeURIComponent(debounced)}&limit=30` : '');
  const recent = useRecentFoods();
  const logEntry = useLogMealEntry();
  const createCustom = useCreateCustomFood();

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const results: any[] = foods.data?.items ?? foods.data ?? [];
  const recentItems: any[] = recent.data?.items ?? recent.data ?? [];

  function logFood(food: any) {
    logEntry.mutate({ foodId: food.id, date: todayISO(), slot, servings: 1 }, { onSuccess: () => haptics.success() });
  }

  function saveCustom() {
    if (!custom?.name || !custom.calories) return;
    createCustom.mutate(
      { name: custom.name, calories: Number(custom.calories), ...({ proteinG: 0, carbsG: 0, fatG: 0 }) },
      {
        onSuccess: (food: any) => {
          logFood(food);
          setCustom(null);
        },
      }
    );
  }

  return (
    <Screen>
      <View style={styles.slotRow}>
        {SLOTS.map((s) => (
          <Chip key={s} label={s[0] + s.slice(1).toLowerCase()} selected={slot === s} onPress={() => setSlot(s)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button label="Scan" icon="barcode-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/nutrition/scan')} />
        <Button label="AI estimate" icon="sparkles-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/ai/food-recognition')} />
      </View>

      <SearchInput value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Search foods…" />

      {!debounced ? (
        <>
          <Text variant="label" style={styles.sectionLabel}>
            Recent
          </Text>
          {recent.isLoading ? (
            <LoadingRow />
          ) : recentItems.length ? (
            recentItems.slice(0, 8).map((f) => <FoodRow key={f.id} food={f} onPress={() => logFood(f)} />)
          ) : (
            <Text variant="muted" style={{ marginBottom: spacing.md }}>
              Nothing logged recently.
            </Text>
          )}
        </>
      ) : null}

      {foods.isLoading && debounced ? (
        <LoadingRow />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(f: any, i) => f.id ?? String(i)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={debounced ? <EmptyState icon="search-outline" title="No foods found" message="Try a different term or add it as a custom food." /> : null}
          renderItem={({ item }: { item: any }) => <FoodRow food={item} onPress={() => logFood(item)} />}
        />
      )}

      {/* Custom food entry */}
      <Pressable onPress={() => setCustom((c) => (c ? null : { name: '', calories: '' }))} style={styles.customToggle}>
        <Ionicons name={custom ? 'chevron-up' : 'add-circle-outline'} size={20} color={colors.primary} />
        <Text variant="label" color="primary" style={{ marginLeft: 6 }}>
          Add custom food
        </Text>
      </Pressable>
      {custom ? (
        <Card style={{ marginTop: spacing.sm }}>
          <Text variant="title" style={{ marginBottom: spacing.sm }}>
            Quick custom food
          </Text>
          <Input label="Name" value={custom.name} onChangeText={(v) => setCustom({ ...custom, name: v })} placeholder="e.g. Chicken rice bowl" />
          <Input label="Calories" value={custom.calories} onChangeText={(v) => setCustom({ ...custom, calories: v })} placeholder="kcal" keyboardType="number-pad" />
          <Button label="Create & log" icon="add" loading={createCustom.isPending} onPress={saveCustom} disabled={!custom.name || !custom.calories} fullWidth style={{ marginTop: spacing.sm }} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  sectionLabel: { marginBottom: spacing.sm, textTransform: 'uppercase', fontSize: 11 },
  customToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
});
