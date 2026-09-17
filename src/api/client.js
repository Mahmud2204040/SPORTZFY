import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from './config';

/**
 * Extracts session cookie value from a Set-Cookie header string
 */
function extractSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/sportzfy_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Core HTTP client for Sportzfy API
 */
export class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (e) {
      console.warn('Failed to read auth token from storage:', e);
      return null;
    }
  }

  async setToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch (e) {
      console.warn('Failed to save auth token to storage:', e);
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = await this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      // Bearer authentication works consistently on native and web clients.
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const config = {
      signal: controller.signal,
      ...options,
      headers,
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Check for Set-Cookie header to auto-capture session token
      const setCookie = response.headers.get('set-cookie') || response.headers.get('Set-Cookie');
      if (setCookie) {
        const extractedToken = extractSessionCookie(setCookie);
        if (extractedToken) {
          await this.setToken(extractedToken);
        }
      }

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { raw: text } : {};
      }

      if (!response.ok) {
        const error = new Error(
          data?.error?.message || data?.message || `HTTP ${response.status}: Request failed`
        );
        error.status = response.status;
        error.code = data?.error?.code || 'UNKNOWN_ERROR';
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        // Clear token on 401
        await this.setToken(null);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
