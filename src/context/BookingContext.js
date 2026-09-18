// Global state for the booking flow + bookings list.
// Fetches authenticated bookings from the API.

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { bookingsApi } from '../api/bookings';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingContext = createContext(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used inside a BookingProvider');
  }
  return ctx;
}

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const requestId = useRef(0);
  const [userLocation, setUserLocation] = useState('');
  const [userCity, setUserCity] = useState('Chattogram');
  const [userArea, setUserArea] = useState('');
  const [locationHydrated, setLocationHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('sportzfy.manual-location').then(value => {
      if (value) { const saved = JSON.parse(value); setUserCity(saved.city || 'Chattogram'); setUserArea(saved.area || ''); setUserLocation([saved.area, saved.city].filter(Boolean).join(', ')); }
    }).catch(() => {}).finally(() => setLocationHydrated(true));
  }, []);
  useEffect(() => {
    if (locationHydrated) AsyncStorage.setItem('sportzfy.manual-location', JSON.stringify({ city: userCity, area: userArea })).catch(() => {});
  }, [userCity, userArea, locationHydrated]);

  // Fetch real bookings from API
  useEffect(() => { requestId.current += 1; setBookings([]); setNextCursor(null); setBookingsError(''); }, [user?.id]);

  const fetchBookings = useCallback(async (cursor = null) => {
    if (!user) { setBookings([]); setNextCursor(null); return; }
    const request = ++requestId.current;
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const res = await bookingsApi.getMyBookings(cursor);
      if (request !== requestId.current) return;
      if (res?.items && Array.isArray(res.items)) {
        // Normalize API booking shape to UI shape
        const normalized = res.items.map((b) => ({
          id: b.id,
          turfId: b.turfId,
          turfName: b.turf?.name || 'Venue unavailable',
          turfImage: b.turf?.coverImage || null,
          date: new Date(b.startTime).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }),
          time: `${new Date(b.startTime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}–${new Date(b.endTime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}`,
          startTime: b.startTime,
          price: b.totalAmount,
          status: b.status === 'CANCELLED' ? 'cancelled' : b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.endTime) <= new Date()) ? 'completed' : 'upcoming',
          paymentMethod: b.paymentMethod,
          referenceCode: b.referenceCode,
          qrCode: b.qrCode,
        }));
        setBookings(current => cursor ? [...current, ...normalized] : normalized);
        setNextCursor(res.nextCursor);
      }
    } catch (err) {
      if (request !== requestId.current) return;
      if (!cursor) setBookings([]);
      setBookingsError(err?.message || 'Could not load bookings.');
    } finally {
      if (request === requestId.current) setBookingsLoading(false);
    }
  }, [user?.id]);

  // Add a confirmed booking to the top of the list
  function addBooking(booking) {
    setBookings((prev) => [booking, ...prev]);
  }

  const value = useMemo(
    () => ({
      bookings,
      addBooking,
      fetchBookings,
      bookingsLoading,
      bookingsError,
      nextCursor,
      userLocation,
      userCity,
      userArea,
      setUserLocation,
      setUserCity,
      setUserArea,
    }),
    [bookings, bookingsLoading, bookingsError, nextCursor, userLocation, userCity, userArea]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}
