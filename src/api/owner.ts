import api from './client';
import {resource, collection, queryString} from './contracts';
import type {Turf, OwnerStats, Slot, Booking} from '../types/models';
export const ownerApi = {
  async getTurfs() {return collection<Turf>(await api.get('/owner/turfs'));},
  async getStats() {return resource<OwnerStats>(await api.get('/owner/stats'));},
  async getBookings(cursor?: string) {return collection<Booking>(await api.get(`/owner/bookings?${queryString({cursor,limit:30})}`));},
  async updateTurf(id: string, input: Partial<Turf>) {return resource<Turf>(await api.patch(`/owner/turfs/${id}`,input));},
  async getAvailability(id: string, date: string) {return resource<{slots:Slot[]}>(await api.get(`/owner/turfs/${id}/availability?${queryString({date})}`));},
  async getBlockedIntervals(turfId?: string) {return collection<any>(await api.get(`/owner/blocked-intervals?${queryString({turfId,limit:100})}`));},
  async createBlockedInterval(input: {turfId: string; startTime: string; endTime: string; reason: string}) {return resource<{id: string}>(await api.post('/owner/blocked-intervals',input));},
  async deleteBlockedInterval(id: string) {await api.delete(`/owner/blocked-intervals?${queryString({id})}`);},
};
