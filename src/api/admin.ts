import api from './client';
import {collection, resource} from './contracts';
import type {Turf} from '../types/models';
export const adminApi = {
  async getStats() {return resource<{stats: Record<string, number>}>(await api.get('/admin/stats'));},
  async getTurfs() {return collection<Turf & {owner?: {name: string}}>(await api.get('/admin/turfs'));},
  async getTurf(id: string) {return resource<Turf & {owner?: {name: string; email?: string; phone?: string}; bookings?: {id: string}[]}>(await api.get(`/admin/turfs/${encodeURIComponent(id)}`));},
  async reviewTurf(id: string, status: string, reason?: string) {return resource<Turf>(await api.post(`/admin/turfs/${id}/review`,{status,reason}));},
  async getUsers(cursor?: string) {return collection<{id:string;name:string;email:string;role:string;createdAt:string;_count:{bookings:number;turfs:number}}>(await api.get(`/admin/users?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`));},
  async getBookings(cursor?: string) {return collection<{id:string;referenceCode:string;status:string;startTime:string;endTime:string;totalAmount:number;user:{name:string};turf:{name:string;city:string;area:string};cancellation?:{reason:string}}>(await api.get(`/admin/bookings?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`));},
};
