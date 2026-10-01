import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { colors, radius, spacing } from '@/lib/theme';
import { convertDistance, mmss, paceLabel } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/store/settings';
import { useLogCardio, useSaveRoute } from '@/hooks/queries';

type WorkoutType = 'RUNNING' | 'CYCLING' | 'WALKING' | 'SWIMMING' | 'HIKING';

const TYPES: { key: WorkoutType; label: string; icon: keyof typeof Ionicons.glyphMap; met: number }[] = [
  { key: 'RUNNING', label: 'Run', icon: 'walk', met: 9.8 },
  { key: 'CYCLING', label: 'Ride', icon: 'bicycle', met: 7.5 },
  { key: 'WALKING', label: 'Walk', icon: 'footprints', met: 3.5 },
  { key: 'HIKING', label: 'Hike', icon: 'mountain', met: 6.0 },
  { key: 'SWIMMING', label: 'Swim', icon: 'water', met: 8.0 },
];

interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;
}

/** Haversine distance in metres between two coordinates. */
function haversine(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * GPS cardio tracker. Streams the device location into a route polyline over a
 * live map, derives distance / pace / calories locally, and saves the session
 * to `POST /api/sessions/cardio` plus the raw route to `POST /api/sessions/routes`.
 */
export default function CardioScreen() {
  const units = useSettings((s) => s.units);
  const logCardio = useLogCardio();
  const saveRoute = useSaveRoute();

  const [type, setType] = React.useState<WorkoutType>('RUNNING');
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [points, setPoints] = React.useState<RoutePoint[]>([]);
  const [region, setRegion] = React.useState({ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [error, setError] = React.useState<string | null>(null);

  const watchSub = React.useRef<null | { remove: () => void }>(null);
  const clock = React.useRef<null | ReturnType<typeof setInterval>>(null);

  const distanceM = React.useMemo(() => points.reduce((sum, p, i) => (i === 0 ? 0 : sum + haversine(points[i - 1], p)), 0), [points]);
  const { value: distValue, label: distUnit } = convertDistance(distanceM, units);
  const pace = distanceM > 100 ? elapsed / (distanceM / 1000) : 0;
  const calories = Math.round(((TYPES.find((t) => t.key === type)?.met ?? 7) * 3.5 * 70) / 200 * (elapsed / 60));

  // Elapsed clock.
  React.useEffect(() => {
    if (running) {
      clock.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (clock.current) {
      clearInterval(clock.current);
      clock.current = null;
    }
    return () => {
      if (clock.current) clearInterval(clock.current);
    };
  }, [running]);

  // Cleanup watcher on unmount.
  React.useEffect(() => () => watchSub.current?.remove(), []);

  async function start() {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied — enable it in Settings to track routes.');
      return;
    }
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 }).catch(() => null);
    if (last) setRegion({ ...region, latitude: last.coords.latitude, longitude: last.coords.longitude });
    haptics.medium();
    if (!elapsed) setPoints([]);
    setRunning(true);
    watchSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
      (pos) => {
        const p: RoutePoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude ?? null,
          timestamp: pos.timestamp,
        };
        setPoints((prev) => [...prev, p]);
        setRegion((r) => ({ ...r, latitude: p.latitude, longitude: p.longitude }));
      }
    );
  }

  function pause() {
    setRunning(false);
    watchSub.current?.remove();
    watchSub.current = null;
  }

  function save() {
    const durationMin = Math.round(elapsed / 60);
    logCardio.mutate(
      {
        activityType: type,
        durationSec: elapsed,
        distanceMeters: Math.round(distanceM),
        calories,
        averagePace: pace ? Math.round(pace) : undefined,
        route: points.length > 1,
      },
      {
        onSuccess: () => {
          if (points.length > 1) {
            saveRoute.mutate({ activityType: type, points, distanceMeters: Math.round(distanceM), durationSec: elapsed, name: `${type.toLowerCase()} ${new Date().toLocaleDateString()}` });
          }
          haptics.success();
          router.back();
        },
      }
    );
  }

  return (
    <View style={styles.root}>
      <MapView style={styles.map} region={region} showsUserLocation provider={undefined}>
        {points.length > 1 ? <Polyline coordinates={points} strokeColor={colors.primary} strokeWidth={4} /> : null}
        {points.length ? <Marker coordinate={points[points.length - 1]} pinColor={colors.primary} /> : null}
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Chip key={t.key} label={t.label} icon={t.icon} selected={type === t.key} onPress={() => setType(t.key)} />
          ))}
        </View>

        {error ? (
          <Text variant="caption" color="danger" style={{ marginBottom: spacing.sm }}>
            {error}
          </Text>
        ) : null}

        <View style={styles.metricRow}>
          <Metric icon="time-outline" value={mmss(elapsed)} label="Time" />
          <Metric icon="navigate-outline" value={`${distValue.toFixed(2)}`} label={`Distance (${distUnit})`} />
          <Metric icon="speedometer-outline" value={paceLabel(pace || null, units)} label="Pace" />
          <Metric icon="flame-outline" value={String(calories)} label="kcal" />
        </View>

        <View style={styles.controls}>
          {!running ? (
            <Button label={elapsed ? 'Resume' : 'Start'} icon="play" size="lg" style={{ flex: 1 }} onPress={start} />
          ) : (
            <Button label="Pause" icon="pause" size="lg" variant="secondary" style={{ flex: 1 }} onPress={pause} />
          )}
          {elapsed > 0 && !running ? (
            <Button label="Save" icon="checkmark" size="lg" style={{ flex: 1, marginLeft: spacing.sm }} loading={logCardio.isPending} onPress={save} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="title" style={{ fontSize: 17, marginTop: 2 }}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  map: { width: '100%', height: '55%' },
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginVertical: spacing.md },
  metric: { width: '46%', flexGrow: 1, backgroundColor: colors.elevated, borderRadius: radius.md, padding: spacing.md },
  controls: { flexDirection: 'row', marginTop: spacing.sm },
});
