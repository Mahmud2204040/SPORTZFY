import api from './client';
import {collection, resource, queryString} from './contracts';
import type {Turf, Slot, DiscoveryFilters, Match} from '../types/models';
export const turfsApi = {
  async getTurfs(filters: DiscoveryFilters = {}) {
    return collection<Turf>(await api.get(`/turfs?${queryString({...filters, limit: 30})}`));
  },
  async getShelves(filters: {city?: string; lat?: number; lng?: number} = {}) {
    const res = await api.get(`/turfs/shelves?${queryString(filters)}`);
    if (!Array.isArray(res?.shelves)) throw new Error('Discovery is temporarily unavailable.');
    return res as {shelves: {id: string; title: string; turfs: Turf[]}[]; squadsShelf?: {matches: Match[]}};
  },
  async getTurfById(id: string) {return resource<Turf>(await api.get(`/turfs/${encodeURIComponent(id)}`));},
  async getAvailability(id: string, date: string) {
    return resource<{slots: Slot[]; serverTime: string}>(await api.get(`/turfs/${encodeURIComponent(id)}/availability?${queryString({date})}`));
  },
};
