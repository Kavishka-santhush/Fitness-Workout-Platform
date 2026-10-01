import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/clerk-expo';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { config } from '@/lib/config';
import { tokenCache } from '@/lib/tokenCache';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/lib/theme';
import { AuthBridge } from '@/components/AuthBridge';

void SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = React.useState(false);

  useEffect(() => {
    // Give the AuthBridge a tick to attach the interceptor before the first nav.
    const t = setTimeout(() => setBootstrapped(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (bootstrapped) void SplashScreen.hideAsync();
  }, [bootstrapped]);

  if (!bootstrapped) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={navTheme}>
              <StatusBar style="light" />
              <AuthBridge />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ThemeProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
