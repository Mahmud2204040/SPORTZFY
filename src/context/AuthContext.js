import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { STORAGE_KEYS } from '../api/config';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Hydrate session from storage on app boot
  useEffect(() => {
    async function hydrateSession() {
      try {
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          // Verify with server in background
          try {
            const meRes = await authApi.getMe();
            if (meRes?.user) {
              setUser(meRes.user);
            } else {
              // Backend responded but session is not valid for this request.
              // Clear cached profile so protected screens don't act authenticated.
              console.log('Session verification failed — clearing local session');
              setUser(null);
              await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
              await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            }
          } catch (e) {
            // If server says unauthorized, we must log out.
            // ApiClient already clears the stored token on 401.
            if (e?.status === 401) {
              console.log('Session verification failed (401) — clearing local session');
              setUser(null);
              await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
              await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            } else {
              console.log('Session verification expired or offline, keeping cached profile if present');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to hydrate user from storage:', e);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    }
    hydrateSession();
  }, []);

  async function login({ email, password, role }) {
    setLoading(true);
    try {
      const res = await authApi.login({
        email: email.trim(),
        password,
        requestedRole: role ? role.toUpperCase() : undefined,
      });
      const nextUser = res.user;
      setUser(nextUser);
      return nextUser;
    } finally {
      setLoading(false);
    }
  }

  async function register({ name, phone, email, password, role }) {
    setLoading(true);
    try {
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone ? phone.trim() : undefined,
        role: role ? role.toUpperCase() : 'CUSTOMER',
      });
      const nextUser = res.user;
      setUser(nextUser);
      return nextUser;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }

  const role = useMemo(() => {
    if (!user) return 'guest';
    return (user.role || 'CUSTOMER').toLowerCase();
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthed: !!user,
      loading,
      initialLoading,
      login,
      register,
      logout,
    }),
    [user, role, loading, initialLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
