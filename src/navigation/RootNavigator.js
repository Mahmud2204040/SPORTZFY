// Root navigator — gates the whole app on whether a user is signed in.
//
//   isAuthed === false           → AuthStack  (Login / Sign Up)
//   isAuthed === true + customer → MainStack  (Customer app)
//   isAuthed === true + owner    → OwnerStack (Turf Owner app)
//
// `key` on NavigationContainer is set to a string derived from
// auth state so React Navigation tears down + rebuilds the stack
// cleanly on login/logout (no stale screens lingering).
//
// To switch roles, the user signs out from Profile → bounces to Login →
// signs up / logs in again with the other role.

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import MainStack from './MainStack';
import OwnerStack from './OwnerStack';
import AdminStack from './AdminStack';

export default function RootNavigator() {
  const { isAuthed, role, initialLoading, pendingDestination, setPendingDestination } = useAuth();
  const navigationRef = useNavigationContainerRef();

  if (initialLoading) return <SafeAreaView style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><ActivityIndicator color="#15803D" size="large" /></SafeAreaView>;

  // Forces a fresh mount when auth state changes.
  const navKey = isAuthed ? `app-${role}` : 'guest';

  return (
    <NavigationContainer key={navKey} ref={navigationRef} onReady={() => {
      if (isAuthed && role === 'customer' && pendingDestination) {
        const destination = pendingDestination;
        setPendingDestination(null);
        setTimeout(() => navigationRef.navigate(destination.name, destination.params), 0);
      }
    }}>
      {isAuthed && role === 'admin' ? (
        <AdminStack />
      ) : isAuthed && role === 'owner' ? (
        <OwnerStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}
