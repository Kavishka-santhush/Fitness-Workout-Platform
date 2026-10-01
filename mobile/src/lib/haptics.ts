import * as Haptics from 'expo-haptics';

/**
 * Small haptics facade so screens don't import expo-haptics directly and so we
 * can no-op safely on web / unsupported platforms.
 */
export const haptics = {
  light() {
    if (Haptics.isAvailableAsync) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  /** Rest-timer completion / PR celebration. */
  selection() {
    void Haptics.selectionAsync().catch(() => {});
  },
};
