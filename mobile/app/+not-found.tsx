import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/lib/theme';

/** Fallback screen for unmatched routes. */
export default function NotFound() {
  return (
    <View style={styles.wrap}>
      <Text variant="h1" center style={{ fontSize: 64, color: colors.primary }}>
        404
      </Text>
      <Text variant="h3" center>
        This corner of the gym is empty
      </Text>
      <Text variant="muted" center style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        The screen you're looking for doesn't exist yet.
      </Text>
      <Link href="/" asChild>
        <Button label="Back to home" icon="home" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
});
