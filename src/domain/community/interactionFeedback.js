import { Vibration } from 'react-native';

export const triggerCommunityTapFeedback = ({ enabled, mode }) => {
  if (!enabled) return;
  Vibration.vibrate(mode === 'sound' ? 6 : 8);
};

export const triggerCommunityConfirmFeedback = ({ enabled, mode }) => {
  if (!enabled) return;
  Vibration.vibrate(mode === 'sound' ? 10 : 14);
};
