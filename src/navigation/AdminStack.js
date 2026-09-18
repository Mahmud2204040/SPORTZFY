// AdminStack — wraps admin screens in a native-stack so we can
// push future details/modals on top later.
//
// Header is hidden because each screen can render its own top bar.

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminOversightScreen from '../screens/admin/AdminOversightScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminOversight" component={AdminOversightScreen} />
    </Stack.Navigator>
  );
}
