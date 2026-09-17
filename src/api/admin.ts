import api from './client';
import {collection, resource} from './contracts';
import type {Turf} from '../types/models';
export const adminApi = {
  async getStats() {return api.get('/admin/stats');},
  async getTurfs() {return collection<Turf & {owner?: {name: string}}>(await api.get('/admin/turfs'));},
  async reviewTurf(id: string, status: string) {return resource<Turf>(await api.post(`/admin/turfs/${id}/review`,{status}));},
};
