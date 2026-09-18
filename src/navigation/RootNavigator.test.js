import React from 'react';
import { act, render } from '@testing-library/react-native';
import RootNavigator from './RootNavigator';

const mockNavigate = jest.fn();
let mockAuthState;
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockAuthState }));
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children, onReady }) => {
      React.useEffect(() => { onReady?.(); }, []);
      return <>{children}</>;
    },
    useNavigationContainerRef: () => ({ navigate: mockNavigate }),
  };
});
jest.mock('./MainStack', () => {
  const { Text } = require('react-native');
  return () => <Text>Player and guest navigation</Text>;
});
jest.mock('./OwnerStack', () => {
  const { Text } = require('react-native');
  return () => <Text>Owner navigation</Text>;
});
jest.mock('./AdminStack', () => {
  const { Text } = require('react-native');
  return () => <Text>Admin navigation</Text>;
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockAuthState = { initialLoading: false, isAuthed: false, role: null, pendingDestination: null, setPendingDestination: jest.fn() };
});

test('session restoration prevents choosing a role stack early', () => {
  mockAuthState.initialLoading = true;
  const view = render(React.createElement(RootNavigator));
  expect(view.queryByText('Player and guest navigation')).toBeNull();
  expect(view.queryByText('Owner navigation')).toBeNull();
  expect(view.queryByText('Admin navigation')).toBeNull();
});

test('guest, owner and administrator receive their respective navigation', () => {
  const view = render(<RootNavigator />);
  expect(view.getByText('Player and guest navigation')).toBeTruthy();
  mockAuthState = { ...mockAuthState, isAuthed: true, role: 'owner' };
  view.rerender(<RootNavigator />);
  expect(view.getByText('Owner navigation')).toBeTruthy();
  mockAuthState = { ...mockAuthState, role: 'admin' };
  view.rerender(<RootNavigator />);
  expect(view.getByText('Admin navigation')).toBeTruthy();
});

test('player login restores the selected destination', () => {
  jest.useFakeTimers();
  mockAuthState = { ...mockAuthState, isAuthed: true, role: 'customer', pendingDestination: { name: 'Booking', params: { turfId: 'venue-1' } } };
  render(<RootNavigator />);
  expect(mockAuthState.setPendingDestination).toHaveBeenCalledWith(null);
  act(() => { jest.runOnlyPendingTimers(); });
  expect(mockNavigate).toHaveBeenCalledWith('Booking', { turfId: 'venue-1' });
  jest.useRealTimers();
});
