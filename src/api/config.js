import { Platform } from 'react-native';

/**
 * Global API Configuration for Sportzfy Mobile
 *
 * Target: Local / LAN Next.js API server running sportzfy-web
 * Default ports:
 *  - Android Emulator: http://10.0.2.2:3000/api/v1
 *  - iOS Simulator / Web: http://localhost:3000/api/v1
 *  - Physical Device: override with EXPO_PUBLIC_API_URL or custom LAN IP
 */

const DEFAULT_DEV_HOST = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '')}/api/v1`
  : `${DEFAULT_DEV_HOST}/api/v1`;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@sportzfy_auth_token',
  USER_PROFILE: '@sportzfy_user_profile',
  USER_LOCATION: '@sportzfy_user_location',
};
