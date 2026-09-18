import api from './client';
import {resource, collection, queryString} from './contracts';
import type {Turf, OwnerStats, Slot, Booking} from '../types/models';
export const ownerApi = {
  async getTurfs() {return collection<Turf>(await api.get('/owner/turfs'));},
  async getStats() {return resource<OwnerStats>(await api.get('/owner/stats'));},
  async getBookings(cursor?: string) {return collection<Booking>(await api.get(`/owner/bookings?${queryString({cursor,limit:30})}`));},
  async updateTurf(id: string, input: Partial<Turf> & {imageUrls?: string[]}) {return resource<Turf>(await api.patch(`/owner/turfs/${id}`,input));},
  async createDraft(input: Partial<Turf> & {imageUrls?: string[]}) {return resource<Turf>(await api.post('/owner/turfs',{...input,draft:true}));},
  async submitTurf(id: string) {return resource<Turf>(await api.post(`/owner/turfs/${encodeURIComponent(id)}/submit`,{}));},
  async getSchedule(id: string) {return resource<{rules: {dayOfWeek:number;openHour:number;closeHour:number;hourlyRate:number}[];proposedRules?: {dayOfWeek:number;openHour:number;closeHour:number;hourlyRate:number}[] | null;source:string}>(await api.get(`/owner/turfs/${encodeURIComponent(id)}/schedule`));},
  async updateSchedule(id: string, rules: {dayOfWeek:number;openHour:number;closeHour:number;hourlyRate:number}[]) {return resource<{rules: {dayOfWeek:number;openHour:number;closeHour:number;hourlyRate:number}[];source:string}>(await api.patch(`/owner/turfs/${encodeURIComponent(id)}/schedule`,{rules}));},
  async getAvailability(id: string, date: string) {return resource<{slots:Slot[]}>(await api.get(`/turfs/${encodeURIComponent(id)}/availability?${queryString({date})}`));},
  async getBlockedIntervals(turfId?: string) {return collection<any>(await api.get(`/owner/blocked-intervals?${queryString({turfId,limit:100})}`));},
  async createBlockedInterval(input: {turfId: string; startTime: string; endTime: string; reason: string}) {return resource<{id: string}>(await api.post('/owner/blocked-intervals',input));},
  async createWalkIn(input: {turfId: string; startTime: string; endTime: string; customerName: string}) {return resource<{id: string}>(await api.post('/owner/walk-ins',input));},
  async deleteBlockedInterval(id: string) {await api.delete(`/owner/blocked-intervals?${queryString({id})}`);},
};
