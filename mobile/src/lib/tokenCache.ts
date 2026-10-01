import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenCache } from '@clerk/clerk-expo/dist/cache';

/**
 * Clerk token cache. SecureStore on native (keys encrypted at rest); a no-op
 * on web where SecureStore is unavailable and Clerk uses cookies instead.
 */
const createTokenCache = (): TokenCache => ({
  getToken: async (key: string) => {
    try {
      if (Platform.OS === 'web') return null;
      const item = await SecureStore.getItemAsync(key);
      return item ?? null;
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, token: string) => {
    try {
      if (Platform.OS === 'web') return;
      await SecureStore.setItemAsync(key, token);
    } catch {
      /* ignore */
    }
  },
  clearToken: async (key: string) => {
    try {
      if (Platform.OS === 'web') return;
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
});

export const tokenCache = createTokenCache();
