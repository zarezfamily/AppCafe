import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';

const hasExpoGoOwnership = () =>
  Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

export const getFaceIdAvailability = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const hasFaceId = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );

  return hasHardware && isEnrolled && hasFaceId;
};

export const authenticateWithFaceId = async () => {
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Accede a Etiove',
    disableDeviceFallback: true,
    fallbackLabel: '',
  });
};

export const shouldBlockFaceIdInExpoGo = () => hasExpoGoOwnership();
