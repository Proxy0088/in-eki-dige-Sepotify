import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Native Haptic Feedback Manager based on Claude Liquid Glass Skill specifications.
 * Supports Capacitor native mobile haptics with seamless navigator.vibrate fallback.
 */
export const triggerHaptic = async (
  style: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' = 'light'
): Promise<void> => {
  try {
    switch (style) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {
    // Fallback for browsers and environments where Capacitor plugins are not native
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (style === 'heavy' || style === 'error') {
          navigator.vibrate(20);
        } else if (style === 'medium') {
          navigator.vibrate(12);
        } else {
          navigator.vibrate(8);
        }
      } catch {
        // Ignore vibration errors
      }
    }
  }
};
