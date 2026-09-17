import api from './client';
import {collection, resource, queryString} from './contracts';
import type {Booking} from '../types/models';
export const bookingsApi = {
  async confirmBooking({holdId, paymentMethod = 'BKASH'}: {holdId: string; paymentMethod?: string}) {
    return resource<Booking>(await api.post('/bookings', {holdId, paymentMethod: paymentMethod.toUpperCase()}, {headers: {'Idempotency-Key': `hold-${holdId}`}}));
  },
  async getMyBookings(cursor?: string) { return collection<Booking>(await api.get(`/bookings?${queryString({cursor, limit:30})}`)); },
  async getBooking(id: string) { return resource<Booking>(await api.get(`/bookings/${encodeURIComponent(id)}`)); },
};
