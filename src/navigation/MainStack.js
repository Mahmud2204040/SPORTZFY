// Stack navigator used INSIDE the tab container.
// It hosts Turf Details, Booking, and Confirmation screens,
// which are pushed on top of the active tab.

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabs from './BottomTabs';
import TurfDetailsScreen from '../screens/customer/TurfDetailsScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import BookingDetailScreen from '../screens/customer/BookingDetailScreen';
import MatchDetailScreen from '../screens/customer/MatchDetailScreen';
import CreateMatchScreen from '../screens/customer/CreateMatchScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: COLORS.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TurfDetails"
        component={TurfDetailsScreen}
        options={{ title: 'Turf Details' }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Booking & Payment' }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: 'Squad Roster' }}
      />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ title: 'Recruit Squad' }}
      />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking details' }} />
      <Stack.Screen name="SignIn" component={LoginScreen} options={{ title: 'Sign in' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
    </Stack.Navigator>
  );
}
