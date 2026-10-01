import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabBarIcon(name: IconName, activeName: IconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? activeName : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabBarIcon('home-outline', 'home') }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout', tabBarIcon: tabBarIcon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition', tabBarIcon: tabBarIcon('nutrition-outline', 'nutrition') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: tabBarIcon('trending-up-outline', 'trending-up') }} />
      <Tabs.Screen name="social" options={{ title: 'Social', tabBarIcon: tabBarIcon('people-outline', 'people') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabBarIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
