import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '@/lib/theme';
import { resolveAssetUrl } from '@/lib/config';
import { initials as toInitials } from '@/lib/utils';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const src = resolveAssetUrl(uri);
  const dimension = { width: size, height: size, borderRadius: radius.full };
  if (src) {
    return <Image source={{ uri: src }} style={[dimension, style]} />;
  }
  return (
    <View style={[dimension, styles.fallback, style]}>
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: size * 0.4 }}>
        {toInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
});
