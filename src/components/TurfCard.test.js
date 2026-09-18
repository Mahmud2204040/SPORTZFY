import React from 'react';
import { render } from '@testing-library/react-native';
import TurfCard from './TurfCard';

test('venue card does not claim availability without a selected date summary', () => {
  const { getByText, queryByText } = render(<TurfCard turf={{ id: 'v1', name: 'City Pitch', area: 'Dhanmondi', city: 'Dhaka', pitchFormats: '7v7', basePricePerHour: 1200 }} />);
  expect(getByText('Availability unknown')).toBeTruthy();
  expect(queryByText('Available Today')).toBeNull();
});

test('venue card reports server availability and selected-date quote', () => {
  const { getByText } = render(<TurfCard turf={{ id: 'v1', name: 'City Pitch', area: 'Dhanmondi', city: 'Dhaka', pitchFormats: '7v7', basePricePerHour: 1200, selectedDateAvailability: { date: '2026-09-19', availableCount: 2, lowestAvailablePrice: 980 } }} />);
  expect(getByText('2 available on 2026-09-19')).toBeTruthy();
  expect(getByText('৳980/hr')).toBeTruthy();
});
