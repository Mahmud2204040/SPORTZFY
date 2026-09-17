import api from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './config';

export const authApi = {
  /**
   * Log in with email + password
   */
  async login({ email, password, requestedRole }) {
    const res = await api.post('/auth/login', {
      email,
      password,
      requestedRole: requestedRole ? requestedRole.toUpperCase() : undefined,
    });

    // Some React Native runtimes don't reliably persist httpOnly cookies.
    // If backend returns the signed token, we store it so the ApiClient
    // can send it via Cookie + Authorization.
    const token = res?.data?.token;
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }

    if (res?.data?.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  /**
   * Register a new user
   */
  async register({ name, email, password, phone, role = 'CUSTOMER' }) {
    const res = await api.post('/auth/register', {
      name,
      email,
      password,
      phone,
      role: role.toUpperCase(),
    });

    const token = res?.data?.token;
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }
    if (res?.data?.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  /**
   * Get current authenticated user
   */
  async getMe() {
    const res = await api.get('/auth/me');
    if (res?.data?.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.data.user));
    }
    return res.data;
  },

  /**
   * Log out current session
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API warning:', e);
    } finally {
      await api.setToken(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }
  },
};
