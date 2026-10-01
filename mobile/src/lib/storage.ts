import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin typed wrapper over AsyncStorage used for the offline-workout cache and
 * small, non-sensitive client state. Clerk tokens live in SecureStore instead.
 */
const NS = 'fitforge:';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(NS + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* ignore write failures (quota / offline) */
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(NS + key);
    } catch {
      /* noop */
    }
  },

  async keys(): Promise<string[]> {
    const all = (await AsyncStorage.getAllKeys()) ?? [];
    return all.filter((k) => k.startsWith(NS)).map((k) => k.slice(NS.length));
  },
};

/** Keys used by the offline workout cache. */
export const offlineKeys = {
  workouts: (id: string) => `offline:workout:${id}`,
  queuedSessions: 'offline:queued-sessions',
} as const;
