import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Units = 'metric' | 'imperial';

export interface NotificationPrefs {
  workoutReminders: boolean;
  streakAlerts: boolean;
  prAlerts: boolean;
  challengeUpdates: boolean;
  classReminders: boolean;
  socialActivity: boolean;
  waterReminders: boolean;
}

interface SettingsState {
  units: Units;
  theme: 'dark' | 'light' | 'system';
  notifications: NotificationPrefs;
  stepGoal: number;
  moveGoal: number; // active calories
  setUnits: (u: Units) => void;
  setTheme: (t: SettingsState['theme']) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
  setGoals: (goals: { stepGoal?: number; moveGoal?: number }) => void;
  reset: () => void;
}

const defaults = {
  units: 'metric' as Units,
  theme: 'dark' as const,
  stepGoal: 10000,
  moveGoal: 600,
  notifications: {
    workoutReminders: true,
    streakAlerts: true,
    prAlerts: true,
    challengeUpdates: true,
    classReminders: true,
    socialActivity: true,
    waterReminders: false,
  } as NotificationPrefs,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setUnits: (units) => set({ units }),
      setTheme: (theme) => set({ theme }),
      setNotification: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      setGoals: ({ stepGoal, moveGoal }) =>
        set((s) => ({
          stepGoal: stepGoal ?? s.stepGoal,
          moveGoal: moveGoal ?? s.moveGoal,
        })),
      reset: () => set({ ...defaults }),
    }),
    {
      name: 'fitforge:settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Convenience selector for weight display given the user's units. */
export function formatWeight(kg: number | null | undefined, units: Units): string {
  if (kg == null) return '—';
  return units === 'imperial' ? `${(kg * 2.20462).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}
