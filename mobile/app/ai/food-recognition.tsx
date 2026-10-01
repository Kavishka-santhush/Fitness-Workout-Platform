import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Feedback';
import { colors, radius, spacing } from '@/lib/theme';
import { todayISO } from '@/lib/utils';
import { useAiFoodRecognition, useAiQuota, useCreateCustomFood, useLogMealEntry } from '@/hooks/queries';
import { haptics } from '@/lib/haptics';

const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

/**
 * AI food recognition: describe (and optionally attach) a meal, let the vision
 * model estimate each item's macros, then save it to the diary in one tap.
 */
export default function FoodRecognitionScreen() {
  const [description, setDescription] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState('LUNCH');
  const [busy, setBusy] = React.useState(false);
  const recognise = useAiFoodRecognition();
  const quota = useAiQuota();
  const customFood = useCreateCustomFood();
  const logEntry = useLogMealEntry();

  const result: any = recognise.data;
  const foods: any[] = result?.foods ?? [];
  const used = quota.data?.usedToday ?? quota.data?.used ?? 0;
  const limit = quota.data?.dailyLimit ?? quota.data?.limit ?? 3;

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera unavailable', 'Allow camera access to snap your meal.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!picked.canceled && picked.assets?.length) setPhoto(picked.assets[0].uri);
  }

  function run() {
    if (!description.trim()) return;
    recognise.mutate({ description: description.trim(), brand: brand.trim() || undefined });
  }

  async function logAll() {
    if (!foods.length) return;
    setBusy(true);
    try {
      for (const f of foods) {
        const created: any = await customFood.mutateAsync({
          name: f.name ?? 'Estimated item',
          brand: f.brand ?? brand.trim() ?? undefined,
          servingLabel: f.serving ?? undefined,
          calories: Number(f.calories ?? 0),
          proteinG: Number(f.proteinG ?? 0),
          carbsG: Number(f.carbsG ?? 0),
          fatG: Number(f.fatG ?? 0),
        });
        const id = created?.id ?? created?.foodId;
        if (!id) continue;
        await logEntry.mutateAsync({ foodId: id, date: todayISO(), slot, servings: 1 });
      }
      haptics.success();
    } catch {
      Alert.alert('Could not log meal', 'One of the items failed to save. Try logging them one by one.');
    } finally {
      setBusy(false);
    }
  }

  function logOne(food: any) {
    customFood.mutate(
      {
        name: food.name ?? 'Estimated item',
        brand: food.brand ?? brand.trim() ?? undefined,
        servingLabel: food.serving ?? undefined,
        calories: Number(food.calories ?? 0),
        proteinG: Number(food.proteinG ?? 0),
        carbsG: Number(food.carbsG ?? 0),
        fatG: Number(food.fatG ?? 0),
      },
      {
        onSuccess: (created: any) => {
          const id = created?.id ?? created?.foodId;
          if (!id) {
            Alert.alert('Saved', 'Item saved as a custom food. Log it from the diary.');
            return;
          }
          logEntry.mutate(
            { foodId: id, date: todayISO(), slot, servings: 1 },
            { onSuccess: () => haptics.success() }
          );
        },
      }
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="h1">AI Food Lens</Text>
        <Text variant="muted" style={{ marginTop: 4, marginBottom: spacing.lg }}>
          Describe the plate in front of you and we will estimate the macros.
        </Text>

        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.quotaRow}>
            <Text variant="label">
              AI credits {used}/{limit} today
            </Text>
            <Pressable onPress={() => router.push('/pricing')}>
              <Text variant="label" color="primary">
                Get more
              </Text>
            </Pressable>
          </View>
          <ProgressBar value={limit ? Math.min(1, used / limit) : 0} height={6} style={{ marginTop: spacing.sm }} color={used >= limit ? colors.danger : colors.primary} />
        </Card>

        <Pressable onPress={pickPhoto} style={styles.photoWell}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera" size={26} color={colors.primary} />
              <Text variant="caption">Snap the meal (optional)</Text>
            </View>
          )}
        </Pressable>
        {photo ? (
          <Button label="Remove photo" icon="trash-outline" variant="ghost" size="sm" onPress={() => setPhoto(null)} style={{ alignSelf: 'flex-end' }} />
        ) : null}

        <Input
          label="What did you eat?"
          placeholder="e.g. A large bowl of chicken fried rice with soy sauce, plus an iced latte"
          value={description}
          onChangeText={setDescription}
          multiline
          containerStyle={{ marginTop: spacing.sm }}
        />
        <Input label="Brand (optional)" placeholder="e.g. Nespresso, McDonald's" value={brand} onChangeText={setBrand} autoCapitalize="none" />

        <Button label="Estimate with AI" icon="sparkles" size="lg" fullWidth loading={recognise.isPending} disabled={!description.trim()} onPress={run} />

        {result ? (
          <>
            <View style={styles.totalRow}>
              <View style={{ flex: 1 }}>
                <Text variant="h2">{result.totalCalories ?? foods.reduce((s, f) => s + Number(f.calories ?? 0), 0)}</Text>
                <Text variant="caption">estimated kcal</Text>
              </View>
              <Badge label={SLOT_LABELS[slot]} tone="default" icon="restaurant-outline" />
            </View>

            <View style={styles.slotRow}>
              {SLOTS.map((s) => (
                <Chip key={s} label={SLOT_LABELS[s]} selected={slot === s} onPress={() => setSlot(s)} />
              ))}
            </View>

            <SectionHeader title="Detected Items" icon="analytics-outline" subtitle={result.confidence ? `${Math.round(result.confidence * 100)}% confidence` : undefined} />
            {foods.length ? (
              foods.map((f: any, i: number) => (
                <Card key={`${f.name}-${i}`} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="title" numberOfLines={1} style={{ fontSize: 15 }}>
                        {f.name ?? 'Item'}
                      </Text>
                      <Text variant="caption">
                        {f.brand ? `${f.brand} · ` : ''}
                        {f.serving ?? '1 serving'}
                      </Text>
                      <View style={styles.macroRow}>
                        <Macro label="P" value={f.proteinG} color={colors.protein} />
                        <Macro label="C" value={f.carbsG} color={colors.carbs} />
                        <Macro label="F" value={f.fatG} color={colors.fat} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="h3">{Math.round(f.calories ?? 0)}</Text>
                      <Text variant="caption">kcal</Text>
                      <Button label="Log" size="sm" icon="add" onPress={() => logOne(f)} style={{ marginTop: spacing.sm }} />
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Card>
                <Text variant="muted" style={{ fontSize: 14 }}>
                  The model could not identify any items. Try adding more detail about portions and cooking method.
                </Text>
              </Card>
            )}

            {result.notes ? (
              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                <Text variant="caption" style={{ flex: 1, marginLeft: spacing.sm }}>
                  {result.notes}
                </Text>
              </View>
            ) : null}

            {foods.length ? (
              <Button
                label={`Log entire ${slot.toLowerCase()} · ${result.totalCalories ?? foods.reduce((s, f) => s + Number(f.calories ?? 0), 0)} kcal`}
                icon="restaurant"
                variant="secondary"
                fullWidth
                loading={busy || customFood.isPending || logEntry.isPending}
                onPress={logAll}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </>
        ) : null}

        <SectionHeader title="Alternatives" icon="swap-horizontal-outline" />
        <Card style={{ marginBottom: spacing.sm }} onPress={() => router.push('/nutrition/scan')}>
          <Row icon="barcode-outline" title="Scan a barcode" subtitle="Exact values for packaged foods" />
        </Card>
        <Card style={{ marginBottom: spacing.sm }} onPress={() => router.replace('/nutrition/log')}>
          <Row icon="search-outline" title="Search the database" subtitle="Over 1M foods and brands" />
        </Card>
      </ScrollView>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text variant="caption">
        {label} {Math.round(value ?? 0)}g
      </Text>
    </View>
  );
}

function Row({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.browseRow}>
      <View style={styles.browseIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15 }}>
          {title}
        </Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  quotaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoWell: { height: 180, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginBottom: spacing.sm },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start' },
  macroRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.elevated, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  browseRow: { flexDirection: 'row', alignItems: 'center' },
  browseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
});
