import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/lib/theme';

/**
 * Decision hub: routes to sign-in, onboarding, or the tab navigator depending
 * on Clerk's auth state and whether the app profile has been created.
 */
export default function Index() {
  const { isSignedIn } = useAuth();
  const { isReady, onboarded, user } = useAuthStore();

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Signed into Clerk but the backend profile has no username → onboarding.
  if (user && !onboarded) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
