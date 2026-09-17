// Global state for the booking flow + bookings list.
// Fetches real bookings from the API when authenticated, falls back to mock data.

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { bookingsApi } from '../api/bookings';

const BookingContext = createContext(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used inside a BookingProvider');
  }
  return ctx;
}

export function BookingProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [userLocation, setUserLocation] = useState('GEC, Chattogram');
  const [userCity, setUserCity] = useState('Chattogram');

  // Fetch real bookings from API
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const res = await bookingsApi.getMyBookings();
      if (res?.items && Array.isArray(res.items)) {
        // Normalize API booking shape to UI shape
        const normalized = res.items.map((b) => ({
          id: b.referenceCode || b.id,
          turfId: b.turfId,
          turfName: b.turf?.name || 'Unknown Turf',
          turfImage: b.turf?.coverImage || null,
          date: b.startTime,
          time: b.startTime,
          price: b.totalAmount,
          status: b.status === 'CONFIRMED' ? 'upcoming' : (b.status || 'upcoming'),
          paymentMethod: b.paymentMethod,
          referenceCode: b.referenceCode,
          qrCode: b.qrCode,
        }));
        setBookings(normalized);
      }
    } catch (err) {
      setBookings([]);
      setBookingsError(err?.message || 'Could not load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  }, []);

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
      userLocation,
      userCity,
      setUserLocation,
      setUserCity,
    }),
    [bookings, bookingsLoading, bookingsError, userLocation, userCity]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}
