import Constants from 'expo-constants';

/**
 * Centralised runtime configuration. Expo inlines any `EXPO_PUBLIC_*` variable
 * into the JS bundle at build time, so these are safe to read on-device.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:5000',
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  scheme: Constants.manifest2?.extra?.expoRouter?.origin ?? 'fitforge://',
};

/** Base URL for uploaded media (Multer local storage served under /uploads). */
export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${config.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
