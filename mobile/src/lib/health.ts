import { Platform } from 'react-native';
import { api, unwrap } from './api';
import type { WearableDay } from './types';

/**
 * Health / wearable bridge.
 *
 * Strategy: the backend is the source of truth for activity rings on the Home
 * screen. We first try to read fresh data from the device's native health
 * store (Apple Health via HealthKit on iOS, Google Fit / Health Connect on
 * Android) and push it to `POST /api/wearable/sync`; we then read the merged
 * daily summary back from `GET /api/wearable/daily`. If the native module is
 * unavailable (Expo Go, web, or the user skipped the optional dependency) we
 * fall back to whatever the server already has.
 */
export interface DailyActivity {
  steps: number;
  activeCalories: number;
  restingHr: number | null;
  sleepHours: number | null;
  source: 'device' | 'server';
}

/** Soft-load an optional native health module without failing the bundle. */
function requireNativeHealth(): any | null {
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@kingstinct/react-native-healthkit');
    }
    if (Platform.OS === 'android') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-health-connect');
    }
  } catch {
    return null;
  }
  return null;
}

async function readFromDevice(): Promise<Partial<WearableDay> | null> {
  const mod = requireNativeHealth();
  if (!mod) return null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (Platform.OS === 'ios' && typeof mod.getStepCount === 'function') {
      const steps = await mod.getStepCount({ startDate: today, endDate: today });
      const calories =
        typeof mod.getEnergyBurned === 'function' ? await mod.getEnergyBurned({ startDate: today, endDate: today }) : 0;
      return { date: today, steps: Number(steps ?? 0), activeCalories: Number(calories ?? 0) };
    }
    if (Platform.OS === 'android' && typeof mod.readRecords === 'function') {
      const rows = await mod.readRecords('Steps', { timeRange: { startTime: Date.now(), duration: { days: 1 } } });
      const steps = Array.isArray(rows) ? rows.reduce((a: number, r: any) => a + Number(r?.count ?? 0), 0) : 0;
      return { date: today, steps, activeCalories: 0 };
    }
  } catch {
    return null;
  }
  return null;
}

/** Push device data (if any) and return the authoritative daily summary. */
export async function syncAndReadToday(): Promise<DailyActivity | null> {
  const device = await readFromDevice();
  if (device) {
    try {
      await api.post('/wearable/sync', {
        source: Platform.OS === 'ios' ? 'APPLE_HEALTH' : 'GOOGLE_FIT',
        points: [
          { type: 'STEPS', date: device.date, value: device.steps ?? 0, unit: 'count' },
          { type: 'ACTIVE_CALORIES', date: device.date, value: device.activeCalories ?? 0, unit: 'kcal' },
        ],
      });
    } catch {
      /* fall through to server read */
    }
  }

  try {
    const daily = await unwrap<any>(api.get('/wearable/daily'));
    return {
      steps: Number(daily?.steps ?? device?.steps ?? 0),
      activeCalories: Number(daily?.activeCalories ?? daily?.calories ?? device?.activeCalories ?? 0),
      restingHr: daily?.restingHr != null ? Number(daily.restingHr) : null,
      sleepHours: daily?.sleepHours != null ? Number(daily.sleepHours) : null,
      source: device ? 'device' : 'server',
    };
  } catch {
    return device
      ? { steps: device.steps ?? 0, activeCalories: device.activeCalories ?? 0, restingHr: null, sleepHours: null, source: 'device' }
      : null;
  }
}

/** Whether a native health source is reachable (drives the Profile sync card). */
export function healthAvailability(): { available: boolean; provider: string | null } {
  const mod = requireNativeHealth();
  if (mod) return { available: true, provider: Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit' };
  return { available: false, provider: null };
}
