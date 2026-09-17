import api from './client';
import {collection, resource} from './contracts';
import type {Turf} from '../types/models';
export const adminApi = {
  async getStats() {return resource<{stats: Record<string, number>}>(await api.get('/admin/stats'));},
  async getTurfs() {return collection<Turf & {owner?: {name: string}}>(await api.get('/admin/turfs'));},
  async getTurf(id: string) {return resource<Turf & {owner?: {name: string; email?: string; phone?: string}; bookings?: {id: string}[]}>(await api.get(`/admin/turfs/${encodeURIComponent(id)}`));},
  async reviewTurf(id: string, status: string) {return resource<Turf>(await api.post(`/admin/turfs/${id}/review`,{status}));},
};
