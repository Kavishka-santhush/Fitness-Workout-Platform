import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, radius, spacing } from '@/lib/theme';
import { todayISO } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useFoodByBarcode, useLogMealEntry } from '@/hooks/queries';

/**
 * Barcode scanner for packaged food. Reads a UPC/EAN via Expo's
 * BarCodeScanner, looks the product up on the backend (`GET /api/foods?barcode=`),
 * and logs it into the selected meal slot.
 */
export default function ScanScreen() {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [scanned, setScanned] = React.useState(false);
  const [barcode, setBarcode] = React.useState('');
  const [slot, setSlot] = React.useState('LUNCH');

  const { data: lookup, isFetching } = useFoodByBarcode(barcode);
  const logEntry = useLogMealEntry();

  const food = Array.isArray(lookup) ? lookup[0] : lookup?.items?.[0] ?? lookup?.food ?? lookup;

  React.useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => setHasPermission(status === 'granted'));
  }, []);

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setBarcode(data);
    haptics.success();
  }

  function log() {
    if (!food?.id) return;
    logEntry.mutate(
      { foodId: food.id, date: todayISO(), slot, servings: 1 },
      { onSuccess: () => { haptics.medium(); router.back(); } }
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text variant="h3" center>
          Camera access needed
        </Text>
        <Text variant="muted" center style={{ marginTop: 8, marginBottom: spacing.lg }}>
          Enable the camera in Settings to scan barcodes.
        </Text>
        <Button label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BarCodeScanner onBarCodeScanned={scanned ? undefined : handleScan} style={StyleSheet.absoluteFillObject} barCodeTypes={[BarCodeScanner.Constants.BarCodeType.upcA, BarCodeScanner.Constants.BarCodeType.upcE, BarCodeScanner.Constants.BarCodeType.ean13, BarCodeScanner.Constants.BarCodeType.code128]} />

      <View style={styles.topBar}>
        <Text variant="h3" style={{ color: colors.white }}>
          Scan a barcode
        </Text>
      </View>
      <View style={styles.reticle} pointerEvents="none" />

      <View style={styles.bottomSheet}>
        {isFetching ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="muted" style={{ marginLeft: spacing.sm }}>
              Looking up {barcode}…
            </Text>
          </View>
        ) : food?.id ? (
          <Card padded style={{ marginBottom: spacing.md }}>
            <View style={styles.foodHead}>
              <View style={{ flex: 1 }}>
                <Text variant="title">{food.name}</Text>
                <Text variant="caption">
                  {food.brand ? `${food.brand} · ` : ''}
                  {food.servingLabel ?? 'per serving'}
                </Text>
              </View>
              <Text variant="h3">{food.calories}</Text>
            </View>
            <View style={styles.macroRow}>
              <Macro label="Protein" value={food.proteinG ?? 0} color={colors.protein} />
              <Macro label="Carbs" value={food.carbsG ?? 0} color={colors.carbs} />
              <Macro label="Fat" value={food.fatG ?? 0} color={colors.fat} />
            </View>
          </Card>
        ) : scanned ? (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.foodHead}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
              <Text variant="body" style={{ flex: 1, marginLeft: spacing.sm }}>
                No match for {barcode}.
              </Text>
            </View>
          </Card>
        ) : (
          <Text variant="muted" center>
            Point the camera at a product barcode.
          </Text>
        )}

        <View style={styles.slotRow}>
          {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((s) => (
            <Badge key={s} label={s[0] + s.slice(1).toLowerCase()} tone={slot === s ? 'default' : 'muted'} style={{ marginRight: spacing.sm }} />
          ))}
          <Button label="Change" variant="ghost" size="sm" onPress={() => setSlot((p) => ({ BREAKFAST: 'LUNCH', LUNCH: 'DINNER', DINNER: 'SNACK', SNACK: 'BREAKFAST' }[p] ?? 'LUNCH'))} />
        </View>

        <View style={styles.actions}>
          {food?.id ? (
            <Button label="Add to log" icon="add" style={{ flex: 1 }} loading={logEntry.isPending} onPress={log} />
          ) : (
            <Button label="Search manually" icon="search-outline" variant="outline" style={{ flex: 1 }} onPress={() => router.replace('/nutrition/log')} />
          )}
          <Button label="Scan again" icon="refresh" variant="secondary" style={{ marginLeft: spacing.sm }} onPress={() => { setScanned(false); setBarcode(''); }} />
        </View>
      </View>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="title" style={{ color }}>
        {Math.round(value)}g
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  topBar: { position: 'absolute', top: spacing['3xl'], left: 0, right: 0, alignItems: 'center' },
  reticle: { position: 'absolute', top: '30%', left: '10%', right: '10%', height: '28%', borderWidth: 3, borderColor: colors.primary, borderRadius: radius.lg, backgroundColor: 'transparent' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  foodHead: { flexDirection: 'row', alignItems: 'center' },
  macroRow: { flexDirection: 'row', marginTop: spacing.md },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  actions: { flexDirection: 'row' },
});
