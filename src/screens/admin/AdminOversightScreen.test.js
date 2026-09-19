import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AdminOversightScreen from './AdminOversightScreen';
import { adminApi } from '../../api/admin';

jest.mock('../../api/admin', () => ({
  adminApi: { getUsers: jest.fn(), getBookings: jest.fn() },
}));
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: callback => React.useEffect(callback, [callback]) };
});
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('ignores a stale users response after switching to bookings and tolerates incomplete records', async () => {
  const users = deferred();
  const bookings = deferred();
  adminApi.getUsers.mockReturnValueOnce(users.promise);
  adminApi.getBookings.mockReturnValueOnce(bookings.promise);

  const view = render(<AdminOversightScreen navigation={{ goBack: jest.fn() }} route={{ params: { section: 'users' } }} />);
  fireEvent.press(view.getByText('Bookings'));

  bookings.resolve({ items: [{ id: 'booking-1', referenceCode: 'SPZ-001', startTime: '2026-09-20T10:00:00Z', endTime: '2026-09-20T11:00:00Z' }], nextCursor: null });
  await waitFor(() => expect(view.getByText('SPZ-001')).toBeTruthy());
  expect(view.getByText('UNKNOWN')).toBeTruthy();
  expect(view.getByText('Venue unavailable · Player unavailable')).toBeTruthy();

  users.resolve({ items: [{ id: 'user-1', name: 'Late User', role: 'CUSTOMER', email: 'late@example.com' }], nextCursor: null });
  await waitFor(() => {
    expect(view.queryByText('Late User')).toBeNull();
    expect(view.getByText('SPZ-001')).toBeTruthy();
  });
});
